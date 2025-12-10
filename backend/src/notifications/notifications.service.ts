import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private prisma: PrismaService,
        private notificationsGateway: NotificationsGateway
    ) { }

    async create(userId: string, type: string, title: string, message: string, data?: any) {
        this.logger.log(`Creating notification for user ${userId}: ${title}`);
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
        return this.prisma.notification.findMany({
            where: {
                userId,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCleanup() {
        this.logger.log('Running notifications cleanup...');
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const result = await this.prisma.notification.deleteMany({
            where: {
                createdAt: {
                    lt: twelveMonthsAgo,
                },
            },
        });
        this.logger.log(`Deleted ${result.count} old notifications.`);
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
