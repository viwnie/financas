import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { FriendshipStatus } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

import { FriendRequestsService } from './friend-requests.service';
import { ExternalFriendsService } from './external-friends.service';

@Injectable()
export class FriendsService {
    constructor(
        private prisma: PrismaService,
        private notificationsGateway: NotificationsGateway,
        private friendRequestsService: FriendRequestsService,
        private externalFriendsService: ExternalFriendsService
    ) { }

    async sendRequest(requesterId: string, usernameToAdd: string) {
        return this.friendRequestsService.sendRequest(requesterId, usernameToAdd);
    }

    async respondToRequest(userId: string, requestId: string, status: FriendshipStatus) {
        return this.friendRequestsService.respondToRequest(userId, requestId, status);
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
        return this.friendRequestsService.getPendingRequests(userId);
    }

    async getSentRequests(userId: string) {
        return this.friendRequestsService.getSentRequests(userId);
    }

    async cancelRequest(userId: string, requestId: string) {
        return this.friendRequestsService.cancelRequest(userId, requestId);
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
        return this.friendRequestsService.getDeclinedRequests(userId);
    }

    async deleteDeclinedRequest(userId: string, requestId: string) {
        return this.friendRequestsService.deleteDeclinedRequest(userId, requestId);
    }
    async getExternalFriends(userId: string) {
        return this.externalFriendsService.getExternalFriends(userId);
    }

    async addExternalFriend(userId: string, name: string) {
        return this.externalFriendsService.addExternalFriend(userId, name);
    }

    async deleteExternalFriend(userId: string, id: string) {
        return this.externalFriendsService.deleteExternalFriend(userId, id);
    }

    async createMergeRequest(requesterId: string, placeholderName: string, targetUsername: string) {
        return this.externalFriendsService.createMergeRequest(requesterId, placeholderName, targetUsername);
    }

    async getReceivedMergeRequests(userId: string) {
        return this.externalFriendsService.getReceivedMergeRequests(userId);
    }

    async getMergeRequestDetails(userId: string, requestId: string) {
        return this.externalFriendsService.getMergeRequestDetails(userId, requestId);
    }

    async respondToMergeRequest(userId: string, requestId: string, status: 'ACCEPTED' | 'REJECTED') {
        return this.externalFriendsService.respondToMergeRequest(userId, requestId, status);
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleFriendshipCleanup() {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const deletedPending = await this.prisma.friendship.deleteMany({
            where: {
                status: FriendshipStatus.PENDING,
                updatedAt: { lt: sevenDaysAgo }
            }
        });

        const deletedCancelled = await this.prisma.friendship.deleteMany({
            where: {
                status: FriendshipStatus.CANCELLED,
                updatedAt: { lt: oneDayAgo }
            }
        });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const deletedLogs = await this.prisma.friendRequestLog.deleteMany({
            where: {
                createdAt: { lt: thirtyDaysAgo }
            }
        });

        console.log(`[Cleanup] Deleted ${deletedPending.count} pending, ${deletedCancelled.count} cancelled friendships, and ${deletedLogs.count} request logs.`);
    }
}
