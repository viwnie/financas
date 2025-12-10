import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
// FriendshipStatus is no longer directly used in this service's methods,
// but might be used in the Prisma client types. Keeping it for now,
import { FriendshipStatus } from '@prisma/client';

// NotificationsGateway, FriendRequestsService, ExternalFriendsService are removed from dependencies.
// import { NotificationsGateway } from '../notifications/notifications.gateway';
// import { FriendRequestsService } from './friend-requests.service';
// import { ExternalFriendsService } from './external-friends.service';

@Injectable()
export class FriendsService {
    private readonly logger = new Logger(FriendsService.name);

    constructor(
        private prisma: PrismaService,
    ) { }

    async getFriends(userId: string) {
        const friendships = await this.prisma.friendship.findMany({
            where: {
                OR: [
                    { requesterId: userId, status: FriendshipStatus.ACCEPTED },
                    { addresseeId: userId, status: FriendshipStatus.ACCEPTED }
                ]
            },
            include: {
                requester: { select: { id: true, name: true, username: true, email: true, avatar: true } },
                addressee: { select: { id: true, name: true, username: true, email: true, avatar: true } }
            }
        });

        return friendships.map(f => {
            if (f.requesterId === userId) return f.addressee;
            return f.requester;
        });
    }

    async removeFriend(userId: string, friendId: string) {
        const friendship = await this.prisma.friendship.findFirst({
            where: {
                OR: [
                    { requesterId: userId, addresseeId: friendId },
                    { requesterId: friendId, addresseeId: userId }
                ],
                status: FriendshipStatus.ACCEPTED
            }
        });

        if (!friendship) {
            throw new Error('Friendship not found');
        }

        return this.prisma.friendship.delete({
            where: { id: friendship.id }
        });
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleFriendshipCleanup() {
        this.logger.log('Running friendship cleanup...');
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const deletedPending = await this.prisma.friendship.deleteMany({
            where: {
                status: FriendshipStatus.PENDING,
                updatedAt: { lt: sevenDaysAgo }
            }
        });

        // assuming CANCELLED is a valid status in FriendshipStatus
        // Check if CANCELLED exists? Original code used it.
        // If not, it might throw. But let's assume it does.
        // Actually, original code used it.

        // Also cleanup Logs
        const deletedLogs = await this.prisma.friendRequestLog.deleteMany({
            where: {
                createdAt: { lt: thirtyDaysAgo }
            }
        });

        this.logger.log(`Cleanup complete: ${deletedPending.count} pending friendships removed, ${deletedLogs.count} logs removed.`);
    }
}
