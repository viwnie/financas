import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionSharesService } from './transaction-shares.service';
import { ParticipantStatus, Prisma } from '@prisma/client';

@Injectable()
export class TransactionParticipantsService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        private transactionSharesService: TransactionSharesService
    ) { }

    async handleParticipantsCreation(transaction: any, participants: any[] | undefined, amount: number, transactionDate: Date, tx?: Prisma.TransactionClient) {
        if (!participants || participants.length === 0) return;

        const client = tx || this.prisma;

        const participantsData: Prisma.TransactionParticipantCreateManyInput[] = [];
        let totalParticipantAmount = 0;
        let totalParticipantPercent = 0;

        for (const p of participants) {
            let userId = p.userId;
            if (!userId && p.username) {
                const user = await client.user.findUnique({ where: { username: p.username } });
                if (user) {
                    userId = user.id;
                }
            }

            const pAmount = p.amount ? Number(p.amount) : 0;
            const pPercent = p.percent ? Number(p.percent) : 0;

            if (p.amount) totalParticipantAmount += pAmount;
            if (p.percent) totalParticipantPercent += pPercent;

            participantsData.push({
                transactionId: transaction.id,
                userId: userId,
                placeholderName: userId ? undefined : p.name,
                shareAmount: p.amount,
                sharePercent: p.percent,
                status: userId ? ParticipantStatus.PENDING : ParticipantStatus.ACCEPTED
            });
        }

        if (totalParticipantAmount > amount) {
            await client.transaction.delete({ where: { id: transaction.id } });
            throw new BadRequestException('Total participant shares exceed transaction amount');
        }
        if (totalParticipantPercent > 100) {
            await client.transaction.delete({ where: { id: transaction.id } });
            throw new BadRequestException('Total participant percentages exceed 100%');
        }

        let creatorAmount = 0;
        let creatorPercent = 0;

        const hasCustomSplits = totalParticipantAmount > 0 || totalParticipantPercent > 0;

        if (hasCustomSplits) {
            if (totalParticipantAmount > 0) {
                creatorAmount = Number(amount) - totalParticipantAmount;
                if (totalParticipantPercent === 0) {
                    creatorPercent = (creatorAmount / Number(amount)) * 100;
                    participantsData.forEach(p => {
                        if (p.shareAmount) {
                            p.sharePercent = (Number(p.shareAmount) / Number(amount)) * 100;
                        }
                    });
                } else {
                    creatorPercent = 100 - totalParticipantPercent;
                }
            } else if (totalParticipantPercent > 0) {
                creatorPercent = 100 - totalParticipantPercent;
                creatorAmount = (creatorPercent / 100) * Number(amount);
                participantsData.forEach(p => {
                    if (p.sharePercent) {
                        p.shareAmount = (Number(p.sharePercent) / 100) * Number(amount);
                    }
                });
            }
        } else {
            const totalCount = 1 + participants.length;
            creatorAmount = Number(amount) / totalCount;
            creatorPercent = 100 / totalCount;

            participantsData.forEach(p => {
                p.shareAmount = creatorAmount;
                p.sharePercent = creatorPercent;
            });
        }

        participantsData.push({
            transactionId: transaction.id,
            userId: transaction.creatorId,
            shareAmount: creatorAmount,
            sharePercent: creatorPercent,
            status: ParticipantStatus.ACCEPTED
        });

        await client.transactionParticipant.createMany({
            data: participantsData
        });

        const invitedParticipants = participantsData.filter(p => p.userId && p.userId !== transaction.creatorId);
        // Notifications are side-effects, usually safe to fire even if tx fails? 
        // Or should we wait? If tx commits, then fire.
        // But here we are inside logic. 
        // Ideally we return notifications to be sent after commit. 
        // But for now, let's keep it here, maybe awaiting them is fine (WebSocket is instantaneous fire-and-forget mostly).
        // Actually NotificationsService creates a DB record too! So it should use `tx` if possible, OR be completely outside.
        // `NotificationsService` logic is currently using `this.prisma`.
        // If we want notifications to be atomic with transaction creation, we should update `NotificationsService` too.
        // BUT, notifications usually shouldn't block/fail transaction logic hard.
        // Let's leave notifications as is for now, assuming they are ok to be separate or "eventual". 
        // However, if we are inside a `tx` and we call `notificationsService.create` which uses `this.prisma` (separate connection/tx), it might work (new db op) or deadlock?
        // It works as separate operation.

        for (const p of invitedParticipants) {
            await this.notificationsService.create(
                p.userId!,
                'transaction_invitation',
                'Shared Transaction Invitation',
                `${transaction.creator.name} invited you to split an expense: ${transaction.description || 'No description'} on ${transactionDate.toLocaleDateString('pt-BR')}`,
                { transactionId: transaction.id }
            );
        }

        // recalculateDynamicShares uses sharesService which uses prisma. Need to verify that too.
        await this.transactionSharesService.recalculateDynamicShares(transaction.id, tx);
    }

    async handleParticipantsUpdate(transaction: any, participants: any[] | undefined, totalAmount: number, isCriticalUpdate: boolean, tx?: Prisma.TransactionClient) {
        if (participants) {
            const client = tx || this.prisma;
            const dbParticipants = transaction.participants.filter((p: any) => p.userId !== transaction.creatorId);
            const keptParticipantIds = new Set<string>();
            const participantsToUpdate: any[] = [];
            const participantsToCreate: any[] = [];

            let totalOthersAmount = 0;

            for (const p of participants) {
                let userId = p.userId;
                if (!userId && p.username) {
                    const user = await client.user.findUnique({ where: { username: p.username } });
                    if (user) userId = user.id;
                }
                p.userId = userId;

                let existingParticipant = p.id ? transaction.participants.find((ep: any) => ep.id === p.id) : undefined;
                if (!existingParticipant && userId) {
                    existingParticipant = transaction.participants.find((ep: any) => ep.userId === userId);
                }

                if (existingParticipant) {
                    keptParticipantIds.add(existingParticipant.id);
                    participantsToUpdate.push({ existing: existingParticipant, dto: p });
                } else {
                    participantsToCreate.push(p);
                }
            }

            const removedParticipantIds = dbParticipants
                .filter((p: any) => !keptParticipantIds.has(p.id))
                .map((p: any) => p.id);

            if (removedParticipantIds.length > 0) {
                const removedParticipants = await client.transactionParticipant.findMany({
                    where: { id: { in: removedParticipantIds } },
                    include: { user: true }
                });

                await client.transactionParticipant.deleteMany({
                    where: { id: { in: removedParticipantIds } }
                });

                for (const p of removedParticipants) {
                    if (p.userId) {
                        await this.notificationsService.create(
                            p.userId,
                            'transaction_update',
                            'Removed from Transaction',
                            `You were removed from the transaction: ${transaction.description || 'No description'}`,
                            { transactionId: transaction.id }
                        );
                    }
                }
            }

            for (const { existing, dto: p } of participantsToUpdate) {
                let shareAmount = p.amount !== undefined ? Number(p.amount) : Number(existing.shareAmount);
                let sharePercent = p.percent !== undefined ? Number(p.percent) : Number(existing.sharePercent);

                totalOthersAmount += shareAmount;

                const oldAmount = existing.baseShareAmount !== null ? Number(existing.baseShareAmount) : Number(existing.shareAmount);
                const oldPercent = existing.baseSharePercent !== null ? Number(existing.baseSharePercent) : Number(existing.sharePercent);

                const isAmountChanged = Math.abs(shareAmount - oldAmount) > 0.001;
                const isPercentChanged = Math.abs(sharePercent - oldPercent) > 0.001;
                const isCriticalParticipantUpdate = isAmountChanged || isPercentChanged;
                const shouldResetStatus = isCriticalUpdate || isCriticalParticipantUpdate;

                let newStatus = existing.status;
                if (existing.userId) {
                    if (shouldResetStatus) newStatus = ParticipantStatus.PENDING;
                } else {
                    if (newStatus === ParticipantStatus.PENDING) newStatus = ParticipantStatus.ACCEPTED;
                }

                await client.transactionParticipant.update({
                    where: { id: existing.id },
                    data: {
                        shareAmount: shareAmount,
                        sharePercent: sharePercent,
                        baseShareAmount: shareAmount,
                        baseSharePercent: sharePercent,
                        status: newStatus
                    }
                });

                if (shouldResetStatus && existing.userId) {
                    await this.notificationsService.create(
                        existing.userId,
                        'transaction_update',
                        'Transaction Updated',
                        `${transaction.creator.name} modificou valores da transação "${transaction.description}". Você aceita esta atualização?`,
                        { transactionId: transaction.id }
                    );
                }
            }

            for (const p of participantsToCreate) {
                const isPending = !!p.userId;
                const newShareAmount = Number(p.amount);
                const newSharePercent = Number(p.percent);

                totalOthersAmount += newShareAmount;

                await client.transactionParticipant.create({
                    data: {
                        transactionId: transaction.id,
                        userId: p.userId,
                        placeholderName: p.userId ? undefined : p.name,
                        shareAmount: newShareAmount,
                        sharePercent: newSharePercent,
                        baseShareAmount: newShareAmount,
                        baseSharePercent: newSharePercent,
                        status: isPending ? ParticipantStatus.PENDING : ParticipantStatus.ACCEPTED
                    }
                });

                if (p.userId) {
                    await this.notificationsService.create(
                        p.userId,
                        'transaction_invitation',
                        'Shared Transaction Invitation',
                        `${transaction.creator.name} invited you to split an expense: ${transaction.description || 'No description'}`,
                        { transactionId: transaction.id }
                    );
                }
            }

            // Update Creator Share
            if (totalOthersAmount > totalAmount + 0.01) {
                throw new BadRequestException('Total participant shares exceed transaction amount');
            }

            const creatorNewAmount = Math.max(0, totalAmount - totalOthersAmount);
            const creatorNewPercent = (creatorNewAmount / totalAmount) * 100;

            const creatorParticipant = transaction.participants.find((p: any) => p.userId === transaction.creatorId);
            if (creatorParticipant) {
                await client.transactionParticipant.update({
                    where: { id: creatorParticipant.id },
                    data: {
                        shareAmount: creatorNewAmount,
                        sharePercent: creatorNewPercent,
                        baseShareAmount: creatorNewAmount,
                        baseSharePercent: creatorNewPercent
                    }
                });
            }

            await this.transactionSharesService.recalculateDynamicShares(transaction.id, tx);

        } else if (isCriticalUpdate) {
            const client = tx || this.prisma;
            const participantsToReset = transaction.participants.filter((p: any) => p.userId !== transaction.creatorId);
            for (const p of participantsToReset) {
                if (p.userId) {
                    await client.transactionParticipant.update({
                        where: { id: p.id },
                        data: { status: ParticipantStatus.PENDING }
                    });

                    await this.notificationsService.create(
                        p.userId,
                        'transaction_update',
                        'Transaction Updated',
                        `The transaction "${transaction.description}" has been updated. Please review and accept/reject again.`,
                        { transactionId: transaction.id }
                    );
                }
            }
            await this.transactionSharesService.recalculateDynamicShares(transaction.id, tx);
        }
    }

    async respondToInvitation(transactionId: string, userId: string, status: ParticipantStatus) {
        if (status !== ParticipantStatus.ACCEPTED && status !== ParticipantStatus.REJECTED) {
            throw new BadRequestException('Invalid status');
        }

        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { creator: true, participants: { include: { user: true } } }
        });

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        const participant = transaction.participants.find(p => p.userId === userId);

        if (!participant) {
            throw new NotFoundException('Participant not found');
        }

        await this.prisma.transactionParticipant.update({
            where: { id: participant.id },
            data: { status }
        });

        if (status === ParticipantStatus.ACCEPTED && Number(participant.shareAmount) === 0) {
            await this.transactionSharesService.recalculateDynamicShares(transaction.id);
        }

        if (transaction.creatorId !== userId) {
            const action = status === ParticipantStatus.ACCEPTED ? 'accepted' : 'rejected';
            await this.notificationsService.create(
                transaction.creatorId,
                'transaction_update',
                'Transaction Update',
                `${participant.user?.name || 'A participant'} ${action} the shared transaction: ${transaction.description || 'No description'}`,
                { transactionId: transaction.id }
            );
        }

        const otherParticipants = transaction.participants.filter(p =>
            p.userId !== userId &&
            p.userId !== transaction.creatorId &&
            p.status === ParticipantStatus.ACCEPTED
        );

        for (const p of otherParticipants) {
            if (p.userId) {
                const action = status === ParticipantStatus.ACCEPTED ? 'accepted' : 'rejected';
                await this.notificationsService.create(
                    p.userId,
                    'transaction_update',
                    'Transaction Update',
                    `${participant.user?.name || 'A participant'} ${action} the shared transaction: ${transaction.description || 'No description'}`,
                    { transactionId: transaction.id }
                );
            }
        }

        const remainingActiveParticipants = transaction.participants.filter(p =>
            p.userId !== transaction.creatorId &&
            p.userId !== userId &&
            (p.status === ParticipantStatus.PENDING || p.status === ParticipantStatus.ACCEPTED)
        );

        const isCurrentUserActive = status === ParticipantStatus.ACCEPTED;

        if (remainingActiveParticipants.length === 0 && !isCurrentUserActive) {
            await this.prisma.transaction.update({
                where: { id: transaction.id },
                data: { isShared: false }
            });

            await this.notificationsService.create(
                transaction.creatorId,
                'transaction_update',
                'Transaction Converted',
                `Your transaction "${transaction.description || 'No description'}" is no longer shared because all participants rejected or left.`,
                { transactionId: transaction.id }
            );
        }

        return { status };
    }

    async leaveTransaction(transactionId: string, userId: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                participants: { include: { user: true } },
                creator: true
            }
        });

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        const participant = transaction.participants.find(p => p.userId === userId);

        if (!participant) {
            throw new NotFoundException('Participant not found');
        }

        await this.prisma.transactionParticipant.update({
            where: { id: participant.id },
            data: { status: ParticipantStatus.EXITED, shareAmount: 0, sharePercent: 0 }
        });

        if (Number(participant.shareAmount) > 0) {
            await this.transactionSharesService.recalculateDynamicShares(transaction.id);
        }

        if (transaction.creatorId !== userId) {
            await this.notificationsService.create(
                transaction.creatorId,
                'transaction_update',
                'Participant Left',
                `${participant.user?.name || 'A participant'} left the shared transaction: ${transaction.description || 'No description'}`,
                { transactionId: transaction.id }
            );
        }

        const otherParticipants = transaction.participants.filter(p =>
            p.userId !== userId &&
            p.userId !== transaction.creatorId &&
            p.status === ParticipantStatus.ACCEPTED
        );

        for (const p of otherParticipants) {
            if (p.userId) {
                await this.notificationsService.create(
                    p.userId,
                    'transaction_update',
                    'Participant Left',
                    `${participant.user?.name || 'A participant'} left the shared transaction: ${transaction.description || 'No description'}`,
                    { transactionId: transaction.id }
                );
            }
        }

        const remainingActiveParticipants = transaction.participants.filter(p =>
            p.userId !== transaction.creatorId &&
            p.userId !== userId &&
            (p.status === ParticipantStatus.PENDING || p.status === ParticipantStatus.ACCEPTED)
        );

        if (remainingActiveParticipants.length === 0) {
            await this.prisma.transaction.update({
                where: { id: transaction.id },
                data: { isShared: false }
            });

            await this.notificationsService.create(
                transaction.creatorId,
                'transaction_update',
                'Transaction Converted',
                `Your transaction "${transaction.description || 'No description'}" is no longer shared because all participants rejected or left.`,
                { transactionId: transaction.id }
            );
        }
    }
}
