import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
    constructor(
        private prisma: PrismaService,
        private notificationsGateway: NotificationsGateway
    ) { }

    async create(userId: string, type: string, title: string, message: string, data?: any) {
        console.log(`[NotificationsService] Creating notification for user ${userId}: ${title}`);
        const notification = await this.prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                data: data || {},
            },
        });

        this.notificationsGateway.sendNotification(userId, 'notification', notification);
        return notification;
    }

    async findAll(userId: string) {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        // Delete notifications older than 12 months
        await this.prisma.notification.deleteMany({
            where: {
                userId,
                createdAt: {
                    lt: twelveMonthsAgo,
                },
            },
        });

        return this.prisma.notification.findMany({
            where: {
                userId,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async markAsRead(userId: string, notificationId: string) {
        const notification = await this.prisma.notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification || notification.userId !== userId) {
            return;
        }

        return this.prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }

    async delete(userId: string, notificationId: string) {
        const notification = await this.prisma.notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification || notification.userId !== userId) {
            return;
        }

        return this.prisma.notification.delete({
            where: { id: notificationId },
        });
    }
}
