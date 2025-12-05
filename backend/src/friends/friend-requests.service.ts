import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { FriendshipStatus } from '@prisma/client';

@Injectable()
export class FriendRequestsService {
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

            const updated = await this.prisma.friendship.update({
                where: { id: existingFriendship.id },
                data: { status: FriendshipStatus.PENDING, requesterId, addresseeId: userToAdd.id },
                include: { requester: { select: { name: true } } }
            });

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

        return this.prisma.friendship.update({
            where: { id: requestId },
            data: { status: FriendshipStatus.CANCELLED }
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
}
