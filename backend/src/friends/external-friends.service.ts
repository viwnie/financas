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
            include: { targetUser: true }
        });

        if (!request) throw new NotFoundException('Request not found');
        if (request.targetUserId !== userId) throw new BadRequestException('Not authorized');

        const updatedRequest = await this.prisma.mergeRequest.update({
            where: { id: requestId },
            data: { status }
        });

        if (status === 'ACCEPTED') {
            const externalFriend = await this.prisma.externalFriend.findFirst({
                where: {
                    userId: request.requesterId,
                    name: request.placeholderName
                }
            });

            if (externalFriend) {
                await this.prisma.externalFriend.delete({ where: { id: externalFriend.id } });
            }

            const existingFriendship = await this.prisma.friendship.findFirst({
                where: {
                    OR: [
                        { requesterId: request.requesterId, addresseeId: userId },
                        { requesterId: userId, addresseeId: request.requesterId }
                    ]
                }
            });

            if (!existingFriendship) {
                await this.prisma.friendship.create({
                    data: {
                        requesterId: request.requesterId,
                        addresseeId: userId,
                        status: 'ACCEPTED'
                    }
                });
            } else if (existingFriendship.status !== 'ACCEPTED') {
                await this.prisma.friendship.update({
                    where: { id: existingFriendship.id },
                    data: { status: 'ACCEPTED' }
                });
            }

            const affectedTransactions = await this.prisma.transaction.findMany({
                where: {
                    creatorId: request.requesterId,
                    participants: {
                        some: {
                            placeholderName: request.placeholderName,
                            userId: null
                        }
                    }
                },
                include: {
                    participants: true
                }
            });

            for (const transaction of affectedTransactions) {
                const externalParticipant = transaction.participants.find(p =>
                    p.placeholderName === request.placeholderName && p.userId === null
                );

                if (!externalParticipant) continue;

                const existingTargetParticipant = transaction.participants.find(p => p.userId === userId);

                if (existingTargetParticipant) {
                    const newShareAmount = Number(existingTargetParticipant.shareAmount) + Number(externalParticipant.shareAmount);
                    const newSharePercent = Number(existingTargetParticipant.sharePercent) + Number(externalParticipant.sharePercent);
                    const newBaseAmount = (existingTargetParticipant.baseShareAmount !== null ? Number(existingTargetParticipant.baseShareAmount) : Number(existingTargetParticipant.shareAmount)) +
                        (externalParticipant.baseShareAmount !== null ? Number(externalParticipant.baseShareAmount) : Number(externalParticipant.shareAmount));
                    const newBasePercent = (existingTargetParticipant.baseSharePercent !== null ? Number(existingTargetParticipant.baseSharePercent) : Number(existingTargetParticipant.sharePercent)) +
                        (externalParticipant.baseSharePercent !== null ? Number(externalParticipant.baseSharePercent) : Number(externalParticipant.sharePercent));

                    await this.prisma.transactionParticipant.update({
                        where: { id: existingTargetParticipant.id },
                        data: {
                            shareAmount: newShareAmount,
                            sharePercent: newSharePercent,
                            baseShareAmount: newBaseAmount,
                            baseSharePercent: newBasePercent
                        }
                    });

                    await this.prisma.transactionParticipant.delete({
                        where: { id: externalParticipant.id }
                    });

                } else {
                    await this.prisma.transactionParticipant.update({
                        where: { id: externalParticipant.id },
                        data: {
                            userId: userId,
                            placeholderName: null,
                            status: 'ACCEPTED'
                        }
                    });
                }
            }

            this.notificationsGateway.sendNotification(request.requesterId, 'merge_request_accepted', {
                message: `${request.targetUser.name} accepted the merge for "${request.placeholderName}"`,
                requestId: request.id
            });
        } else {
            this.notificationsGateway.sendNotification(request.requesterId, 'merge_request_rejected', {
                message: `${request.targetUser.name} rejected the merge for "${request.placeholderName}"`,
                requestId: request.id
            });
        }

        return updatedRequest;
    }
}
