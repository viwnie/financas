import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class ExternalFriendsService {
    constructor(
        private prisma: PrismaService,
        private notificationsGateway: NotificationsGateway
    ) { }

    async getExternalFriends(userId: string) {
        const storedExternalFriends = await this.prisma.externalFriend.findMany({
            where: { userId },
            select: { id: true, name: true }
        });

        const transactions = await this.prisma.transaction.findMany({
            where: { creatorId: userId },
            include: { participants: true }
        });

        const externalFriendsMap = new Map<string, { id: string | null, name: string }>();

        storedExternalFriends.forEach(f => externalFriendsMap.set(f.name, { id: f.id, name: f.name }));

        transactions.forEach(t => {
            t.participants.forEach(p => {
                if (!p.userId && p.placeholderName) {
                    if (!externalFriendsMap.has(p.placeholderName)) {
                        externalFriendsMap.set(p.placeholderName, { id: null, name: p.placeholderName });
                    }
                }
            });
        });

        return Array.from(externalFriendsMap.values());
    }

    async addExternalFriend(userId: string, name: string) {
        const existing = await this.prisma.externalFriend.findFirst({
            where: { userId, name }
        });

        if (existing) {
            throw new BadRequestException('External friend already exists');
        }

        return this.prisma.externalFriend.create({
            data: { userId, name }
        });
    }

    async deleteExternalFriend(userId: string, id: string) {
        const friend = await this.prisma.externalFriend.findUnique({ where: { id } });
        if (!friend) throw new NotFoundException('External friend not found');
        if (friend.userId !== userId) throw new BadRequestException('Not authorized');

        return this.prisma.externalFriend.delete({ where: { id } });
    }

    async createMergeRequest(requesterId: string, placeholderName: string, targetUsername: string) {
        const targetUser = await this.prisma.user.findUnique({ where: { username: targetUsername } });
        if (!targetUser) throw new NotFoundException('Target user not found');

        const existing = await this.prisma.mergeRequest.findFirst({
            where: {
                requesterId,
                targetUserId: targetUser.id,
                placeholderName,
                status: 'PENDING'
            }
        });

        if (existing) throw new BadRequestException('Merge request already pending');

        const request = await this.prisma.mergeRequest.create({
            data: {
                requesterId,
                targetUserId: targetUser.id,
                placeholderName,
                status: 'PENDING'
            },
            include: { requester: { select: { name: true } } }
        });

        this.notificationsGateway.sendNotification(targetUser.id, 'merge_request', {
            message: `${request.requester.name} wants to link "External Friend: ${placeholderName}" to your account`,
            requestId: request.id
        });

        return request;
    }

    async getReceivedMergeRequests(userId: string) {
        return this.prisma.mergeRequest.findMany({
            where: { targetUserId: userId, status: 'PENDING' },
            include: { requester: { select: { name: true } } }
        });
    }

    async getMergeRequestDetails(userId: string, requestId: string) {
        const request = await this.prisma.mergeRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) throw new NotFoundException('Request not found');
        if (request.targetUserId !== userId) throw new BadRequestException('Not authorized');

        const transactions = await this.prisma.transaction.findMany({
            where: {
                creatorId: request.requesterId,
                participants: {
                    some: {
                        placeholderName: request.placeholderName,
                        userId: null
                    }
                }
            },
            select: {
                id: true,
                date: true,
                description: true,
                amount: true,
                participants: {
                    where: { placeholderName: request.placeholderName }
                }
            }
        });

        return transactions;
    }

    async respondToMergeRequest(userId: string, requestId: string, status: 'ACCEPTED' | 'REJECTED') {
        const request = await this.prisma.mergeRequest.findUnique({
            where: { id: requestId },
            include: { requester: true, targetUser: true }
        });

        if (!request) throw new NotFoundException('Merge request not found');
        if (request.targetUserId !== userId) throw new BadRequestException('Not authorized to respond to this request');
        if (request.status !== 'PENDING') throw new BadRequestException('Merge request is not pending');

        let updatedRequest;

        if (status === 'ACCEPTED') {
            // ACCEPTED -> Merge
            // 1. Create real friendship
            // 2. Update all transactions using externalFriendId to use real userId
            // 3. Delete external friend? Or keep marked as merged? usually delete or mark.
            // Current logic deletes it.

            updatedRequest = await this.mergeExternalFriend(request.requesterId, request.placeholderName, userId, requestId);

            this.notificationsGateway.sendNotification(request.requesterId, 'merge_request_accepted', {
            });
        } else {
            this.notificationsGateway.sendNotification(request.requesterId, 'merge_request_rejected', {
                message: `${request.targetUser.name} rejected the merge for "${request.placeholderName}"`,
                requestId: request.id
            });
        }

        return updatedRequest;
    }

    private async mergeExternalFriend(requesterId: string, placeholderName: string, realUserId: string, requestId: string) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Create Friendship (requester <-> realUser)
            const existingFriendship = await tx.friendship.findFirst({
                where: {
                    OR: [
                        { requesterId: requesterId, addresseeId: realUserId },
                        { requesterId: realUserId, addresseeId: requesterId }
                    ],
                    status: 'ACCEPTED'
                }
            });

            if (!existingFriendship) {
                await tx.friendship.create({
                    data: {
                        requesterId: requesterId,
                        addresseeId: realUserId,
                        status: 'ACCEPTED'
                    }
                });
            }

            // 2. Update Transactions (Handle formatting/merging logic)
            // Find all participant entries for this placeholder created by requester
            const placeholderParticipants = await tx.transactionParticipant.findMany({
                where: {
                    transaction: { creatorId: requesterId },
                    placeholderName: placeholderName,
                    userId: null
                },
                include: { transaction: true }
            });

            for (const p of placeholderParticipants) {
                // Check if the real user is *already* in this specific transaction
                const existingRealUserParticipant = await tx.transactionParticipant.findFirst({
                    where: {
                        transactionId: p.transactionId,
                        userId: realUserId
                    }
                });

                if (existingRealUserParticipant) {
                    // MERGE: Update existing user's share and delete the placeholder entry
                    const newAmount = Number(existingRealUserParticipant.shareAmount) + Number(p.shareAmount);
                    const newPercent = Number(existingRealUserParticipant.sharePercent) + Number(p.sharePercent);

                    // We also merge base amounts if they exist, or fallback to current
                    const baseAmount = Number(existingRealUserParticipant.baseShareAmount || existingRealUserParticipant.shareAmount) +
                        Number(p.baseShareAmount || p.shareAmount);
                    const basePercent = Number(existingRealUserParticipant.baseSharePercent || existingRealUserParticipant.sharePercent) +
                        Number(p.baseSharePercent || p.sharePercent);

                    await tx.transactionParticipant.update({
                        where: { id: existingRealUserParticipant.id },
                        data: {
                            shareAmount: newAmount,
                            sharePercent: newPercent,
                            baseShareAmount: baseAmount,
                            baseSharePercent: basePercent,
                            // If the existing user was already ACCEPTED, they stay ACCEPTED? 
                            // Or should they go to PENDING because the amount changed? 
                            // Usually pending is safer for changes.
                            status: 'PENDING'
                        }
                    });

                    // Delete the placeholder entry since its value is now in the real user's entry
                    await tx.transactionParticipant.delete({
                        where: { id: p.id }
                    });

                } else {
                    // NO COLLISION: Just update the placeholder entry to be the real user
                    await tx.transactionParticipant.update({
                        where: { id: p.id },
                        data: {
                            placeholderName: null,
                            userId: realUserId,
                            status: 'PENDING'
                        }
                    });
                }
            }

            // 3. Delete External Friend Entry
            const extFriend = await tx.externalFriend.findFirst({
                where: { userId: requesterId, name: placeholderName }
            });
            if (extFriend) {
                await tx.externalFriend.delete({ where: { id: extFriend.id } });
            }

            // 4. Update Request
            return tx.mergeRequest.update({
                where: { id: requestId },
                data: { status: 'ACCEPTED' }
            });
        });
    }
}
