import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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
                requester: { select: { name: true, username: true } },
                addressee: { select: { name: true, username: true } },
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
                requester: { select: { name: true, username: true } },
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
                addressee: { select: { name: true, username: true } },
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

    async removeFriend(userId: string, username: string) {
        const friend = await this.prisma.user.findUnique({ where: { username } });
        if (!friend) {
            throw new NotFoundException('User not found');
        }

        const friendship = await this.prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId: userId, addresseeId: friend.id, status: FriendshipStatus.ACCEPTED },
                    { requesterId: friend.id, addresseeId: userId, status: FriendshipStatus.ACCEPTED },
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
                addressee: { select: { name: true, username: true } },
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
        // 1. Get explicitly added external friends
        const storedExternalFriends = await this.prisma.externalFriend.findMany({
            where: { userId },
            select: { id: true, name: true }
        });

        // 2. Find transactions created by user where participants have no userId (placeholder)
        const transactions = await this.prisma.transaction.findMany({
            where: { creatorId: userId },
            include: { participants: true }
        });

        const externalFriendsMap = new Map<string, { id: string | null, name: string }>();

        // Add stored ones
        storedExternalFriends.forEach(f => externalFriendsMap.set(f.name, { id: f.id, name: f.name }));

        // Add from transactions
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
        // Check if already exists in DB
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
        // Verify target user exists
        const targetUser = await this.prisma.user.findUnique({ where: { username: targetUsername } });
        if (!targetUser) throw new NotFoundException('Target user not found');

        // Check if request already exists
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

        // Notify target user
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
            // 1. Find and delete the ExternalFriend record
            // We need to find it first to ensure it exists and belongs to the requester
            const externalFriend = await this.prisma.externalFriend.findFirst({
                where: {
                    userId: request.requesterId,
                    name: request.placeholderName
                }
            });

            if (externalFriend) {
                await this.prisma.externalFriend.delete({ where: { id: externalFriend.id } });
            }

            // 2. Create Friendship if it doesn't exist
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
                // Optionally update existing friendship to ACCEPTED? 
                // The user didn't explicitly ask for this, but it makes sense.
                // Let's stick to creating if not exists for now to avoid side effects on pending requests.
                // Actually, if they are merging, they SHOULD be friends. 
                // Let's update it to ACCEPTED if it exists but is PENDING.
                await this.prisma.friendship.update({
                    where: { id: existingFriendship.id },
                    data: { status: 'ACCEPTED' }
                });
            }

            // 3. Update transactions (Auto-accept)
            await this.prisma.transactionParticipant.updateMany({
                where: {
                    transaction: { creatorId: request.requesterId },
                    placeholderName: request.placeholderName,
                    userId: null
                },
                data: {
                    userId: userId,
                    placeholderName: null,
                    status: 'ACCEPTED' // Auto-accept
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

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleFriendshipCleanup() {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Delete PENDING requests older than 7 days
        const deletedPending = await this.prisma.friendship.deleteMany({
            where: {
                status: FriendshipStatus.PENDING,
                updatedAt: { lt: sevenDaysAgo }
            }
        });

        // Delete CANCELLED requests older than 24 hours
        const deletedCancelled = await this.prisma.friendship.deleteMany({
            where: {
                status: FriendshipStatus.CANCELLED,
                updatedAt: { lt: oneDayAgo }
            }
        });

        // Delete FriendRequestLogs older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const deletedLogs = await this.prisma.friendRequestLog.deleteMany({
            where: {
                createdAt: { lt: thirtyDaysAgo }
            }
        });

        console.log(`[Cleanup] Deleted ${deletedPending.count} pending, ${deletedCancelled.count} cancelled friendships, and ${deletedLogs.count} request logs.`);
    }
}
