import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ParticipantStatus } from '@prisma/client';

import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class SharedTransactionsService {
    private readonly logger = new Logger(SharedTransactionsService.name);

    constructor(
        private prisma: PrismaService,
        private notificationsGateway: NotificationsGateway
    ) { }

    async getPendingInvitations(userId: string) {
        return this.prisma.transactionParticipant.findMany({
            where: {
                userId,
                status: ParticipantStatus.PENDING,
            },
            include: {
                transaction: {
                    include: {
                        creator: { select: { name: true, username: true } },
                        category: true,
                    },
                },
            },
        });
    }

    async respondToInvitation(userId: string, participantId: string, status: ParticipantStatus) {
        if (status !== ParticipantStatus.ACCEPTED && status !== ParticipantStatus.REJECTED) {
            throw new BadRequestException('Invalid status');
        }

        const participant = await this.prisma.transactionParticipant.findUnique({
            where: { id: participantId },
        });

        if (!participant) {
            throw new NotFoundException('Invitation not found');
        }

        if (participant.userId !== userId) {
            throw new BadRequestException('This invitation is not for you');
        }

        this.logger.log(`User ${userId} responded to invitation ${participantId} with status ${status}`);

        return this.prisma.transactionParticipant.update({
            where: { id: participantId },
            data: { status },
        });
    }
}
