import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FriendshipStatus } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class FriendsService {
    constructor(
        private prisma: PrismaService,
        private notificationsGateway: NotificationsGateway
    ) { }

    async sendRequest(requesterId: string, usernameToAdd: string) {
        const userToAdd = await this.prisma.user.findUnique({
            where: { username: usernameToAdd },
        });

        if (!userToAdd) {
            throw new NotFoundException('User not found');
        }

        if (userToAdd.id === requesterId) {
            throw new BadRequestException('You cannot add yourself');
        }

        // Rate Limit Check
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentRequests = await this.prisma.friendRequestLog.count({
            where: {
                requesterId,
                addresseeId: userToAdd.id,
                createdAt: { gte: oneHourAgo },
            },
        });

        if (recentRequests >= 7) {
            throw new BadRequestException('You have reached the limit of friend requests to this user. Please try again later.');
        }

        const existingFriendship = await this.prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId, addresseeId: userToAdd.id },
                    { requesterId: userToAdd.id, addresseeId: requesterId },
                ],
            },
        });

        if (existingFriendship) {
            if (existingFriendship.status === FriendshipStatus.ACCEPTED) {
                throw new BadRequestException('You are already friends');
            }
            if (existingFriendship.status === FriendshipStatus.PENDING) {
                throw new BadRequestException('Friend request already pending');
            }

            // Anti-Spam Check - Removed in favor of 7 requests/hour limit
            // if (existingFriendship.status === FriendshipStatus.CANCELLED) {
            //     const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            //     if (existingFriendship.updatedAt > fiveMinutesAgo) {
            //         throw new BadRequestException('Please wait 5 minutes before sending another request to this user.');
            //     }
            // }

            // If declined or cancelled (and cooldown passed), update to PENDING
            const updated = await this.prisma.friendship.update({
                where: { id: existingFriendship.id },
                data: { status: FriendshipStatus.PENDING, requesterId, addresseeId: userToAdd.id },
                include: { requester: { select: { name: true } } }
            });

            // Log the request
            await this.prisma.friendRequestLog.create({
                data: { requesterId, addresseeId: userToAdd.id }
            });

            this.notificationsGateway.sendNotification(userToAdd.id, 'friend_request', {
                message: `${updated.requester.name} sent you a friend request`,
                friendshipId: updated.id
            });
            return updated;
        }

        const newFriendship = await this.prisma.friendship.create({
            data: {
                requesterId,
                addresseeId: userToAdd.id,
                status: FriendshipStatus.PENDING,
            },
            include: { requester: { select: { name: true } } }
        });

        // Log the request
        await this.prisma.friendRequestLog.create({
            data: { requesterId, addresseeId: userToAdd.id }
        });

        this.notificationsGateway.sendNotification(userToAdd.id, 'friend_request', {
            message: `${newFriendship.requester.name} sent you a friend request`,
            friendshipId: newFriendship.id
        });

        return newFriendship;
    }

    async respondToRequest(userId: string, requestId: string, status: FriendshipStatus) {
        if (status !== FriendshipStatus.ACCEPTED && status !== FriendshipStatus.DECLINED) {
            throw new BadRequestException('Invalid status');
        }

        const request = await this.prisma.friendship.findUnique({
            where: { id: requestId },
            include: { requester: { select: { id: true, name: true } } }
        });

        if (!request) {
            throw new NotFoundException('Request not found');
        }

        if (request.addresseeId !== userId) {
            throw new BadRequestException('This request is not for you');
        }

        const updated = await this.prisma.friendship.update({
            where: { id: requestId },
            data: { status },
            include: { addressee: { select: { username: true, name: true } } }
        });

        if (status === FriendshipStatus.DECLINED) {
            this.notificationsGateway.sendNotification(request.requesterId, 'friend_request_declined', {
                message: `Your friend request to ${updated.addressee.username} was declined`,
                friendshipId: updated.id
            });
        }

        return updated;
    }

    async getFriends(userId: string) {
        const friendships = await this.prisma.friendship.findMany({
            where: {
                OR: [
                    { requesterId: userId, status: FriendshipStatus.ACCEPTED },
                    { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
                ],
            },
            include: {
                requester: { select: { id: true, name: true, username: true, email: true } },
                addressee: { select: { id: true, name: true, username: true, email: true } },
            },
        });

        return friendships.map(f => {
            return f.requesterId === userId ? f.addressee : f.requester;
        });
    }

    async getPendingRequests(userId: string) {
        return this.prisma.friendship.findMany({
            where: {
                addresseeId: userId,
                status: FriendshipStatus.PENDING,
            },
            include: {
                requester: { select: { id: true, name: true, username: true } },
            },
        });
    }

    async getSentRequests(userId: string) {
        return this.prisma.friendship.findMany({
            where: {
                requesterId: userId,
                status: FriendshipStatus.PENDING,
            },
            include: {
                addressee: { select: { id: true, name: true, username: true } },
            },
        });
    }

    async cancelRequest(userId: string, requestId: string) {
        const request = await this.prisma.friendship.findUnique({
            where: { id: requestId },
        });

        if (!request) {
            throw new NotFoundException('Request not found');
        }

        if (request.requesterId !== userId) {
            throw new BadRequestException('You can only cancel your own requests');
        }

        if (request.status !== FriendshipStatus.PENDING) {
            throw new BadRequestException('Cannot cancel a non-pending request');
        }

        // Instead of deleting, set to CANCELLED for anti-spam
        return this.prisma.friendship.update({
            where: { id: requestId },
            data: { status: FriendshipStatus.CANCELLED }
        });
    }

    async removeFriend(userId: string, friendId: string) {
        const friendship = await this.prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId: userId, addresseeId: friendId, status: FriendshipStatus.ACCEPTED },
                    { requesterId: friendId, addresseeId: userId, status: FriendshipStatus.ACCEPTED },
                ],
            },
        });

        if (!friendship) {
            throw new NotFoundException('Friendship not found');
        }

        return this.prisma.friendship.delete({
            where: { id: friendship.id }
        });
    }

    async getDeclinedRequests(userId: string) {
        return this.prisma.friendship.findMany({
            where: {
                requesterId: userId,
                status: FriendshipStatus.DECLINED,
            },
            include: {
                addressee: { select: { id: true, name: true, username: true } },
            },
        });
    }

    async deleteDeclinedRequest(userId: string, requestId: string) {
        const request = await this.prisma.friendship.findUnique({
            where: { id: requestId },
        });

        if (!request) {
            throw new NotFoundException('Request not found');
        }

        if (request.requesterId !== userId) {
            throw new BadRequestException('You can only delete your own requests');
        }

        if (request.status !== FriendshipStatus.DECLINED) {
            throw new BadRequestException('Cannot delete a non-declined request');
        }

        return this.prisma.friendship.delete({
            where: { id: requestId },
        });
    }

    async getExternalFriends(userId: string) {
        // Find transactions created by user where participants have no userId (placeholder)
        const transactions = await this.prisma.transaction.findMany({
            where: { creatorId: userId },
            include: { participants: true }
        });

        const externalFriends = new Set<string>();
        transactions.forEach(t => {
            t.participants.forEach(p => {
                if (!p.userId && p.placeholderName) {
                    externalFriends.add(p.placeholderName);
                }
            });
        });

        return Array.from(externalFriends).map(name => ({ name }));
    }

    async createMergeRequest(requesterId: string, placeholderName: string, targetUserId: string) {
        // Verify target user exists
        const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) throw new NotFoundException('Target user not found');

        // Check if request already exists
        const existing = await this.prisma.mergeRequest.findFirst({
            where: {
                requesterId,
                targetUserId,
                placeholderName,
                status: 'PENDING'
            }
        });

        if (existing) throw new BadRequestException('Merge request already pending');

        const request = await this.prisma.mergeRequest.create({
            data: {
                requesterId,
                targetUserId,
                placeholderName,
                status: 'PENDING'
            },
            include: { requester: { select: { name: true } } }
        });

        // Notify target user
        this.notificationsGateway.sendNotification(targetUserId, 'merge_request', {
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

        // Find affected transactions
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
            // Update transactions
            await this.prisma.transactionParticipant.updateMany({
                where: {
                    transaction: { creatorId: request.requesterId },
                    placeholderName: request.placeholderName,
                    userId: null
                },
                data: {
                    userId: userId,
                    placeholderName: null,
                    status: 'PENDING' // Set to pending so user can accept/reject the transactions individually? Or ACCEPTED?
                    // Plan said PENDING. Let's stick to PENDING so they can review each.
                }
            });

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
