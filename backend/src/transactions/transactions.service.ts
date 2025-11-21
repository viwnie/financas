import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType, InstallmentStatus, ParticipantStatus, Prisma } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TransactionsService {
    constructor(
        private prisma: PrismaService,
        private notificationsGateway: NotificationsGateway,
        private notificationsService: NotificationsService
    ) { }

    async create(userId: string, dto: CreateTransactionDto) {
        const { amount, date, installmentsCount, participants, categoryName, categoryId, isFixed, ...rest } = dto;
        const transactionDate = new Date(date);

        let finalCategoryId = categoryId;

        if (categoryName) {
            // Find or create category
            let category = await this.prisma.category.findFirst({
                where: {
                    name: { equals: categoryName, mode: 'insensitive' },
                    OR: [
                        { userId: userId },
                        { isSystem: true }
                    ]
                }
            });

            if (!category) {
                category = await this.prisma.category.create({
                    data: {
                        name: categoryName,
                        userId: userId,
                        isSystem: false
                    }
                });
            }
            finalCategoryId = category.id;
        }

        if (!finalCategoryId) {
            throw new BadRequestException('Category is required (either id or name)');
        }

        // 1. Create the main transaction
        const transaction = await this.prisma.transaction.create({
            data: {
                ...rest,
                amount,
                date: transactionDate,
                creatorId: userId,
                categoryId: finalCategoryId,
                isShared: !!(participants && participants.length > 0),
                isFixed: !!isFixed,
            },
            include: { creator: { select: { name: true } } }
        });

        // 2. Handle Installments
        if (installmentsCount && installmentsCount > 1) {
            const installmentAmount = amount / installmentsCount;
            const installmentsData: Prisma.InstallmentCreateManyInput[] = [];

            for (let i = 0; i < installmentsCount; i++) {
                const dueDate = new Date(transactionDate);
                dueDate.setMonth(dueDate.getMonth() + i);

                installmentsData.push({
                    transactionId: transaction.id,
                    number: i + 1,
                    amount: installmentAmount,
                    dueDate: dueDate,
                    status: InstallmentStatus.PENDING,
                });
            }

            await this.prisma.installment.createMany({
                data: installmentsData,
            });
        }

        // 3. Handle Participants (Shared)
        if (participants && participants.length > 0) {
            const participantsData: Prisma.TransactionParticipantCreateManyInput[] = [];
            let totalParticipantAmount = 0;
            let totalParticipantPercent = 0;

            // Process invited/ad-hoc participants
            for (const p of participants) {
                // If no specific split info is provided, we'll calculate equal splits later
                // But if provided, we use it.
                const pAmount = p.amount ? Number(p.amount) : 0;
                const pPercent = p.percent ? Number(p.percent) : 0;

                if (p.amount) totalParticipantAmount += pAmount;
                if (p.percent) totalParticipantPercent += pPercent;

                participantsData.push({
                    transactionId: transaction.id,
                    userId: p.userId, // Can be undefined for ad-hoc
                    placeholderName: p.userId ? undefined : p.name, // Use name if no userId
                    shareAmount: p.amount,
                    sharePercent: p.percent,
                    status: p.userId ? ParticipantStatus.PENDING : ParticipantStatus.ACCEPTED
                });
            }

            // Validation: Ensure participants don't exceed total
            if (totalParticipantAmount > amount) {
                // Clean up the transaction we just created (since we can't easily rollback without a transaction block, 
                // but Prisma doesn't support nested writes with complex logic easily here. 
                // Ideally we should have validated BEFORE creating the transaction.
                // Let's move this validation up or delete the transaction.)
                await this.prisma.transaction.delete({ where: { id: transaction.id } });
                throw new BadRequestException('Total participant shares exceed transaction amount');
            }
            if (totalParticipantPercent > 100) {
                await this.prisma.transaction.delete({ where: { id: transaction.id } });
                throw new BadRequestException('Total participant percentages exceed 100%');
            }

            // Calculate Creator's Share
            let creatorAmount = 0;
            let creatorPercent = 0;

            const hasCustomSplits = totalParticipantAmount > 0 || totalParticipantPercent > 0;

            if (hasCustomSplits) {
                // If using amounts
                if (totalParticipantAmount > 0) {
                    creatorAmount = Number(amount) - totalParticipantAmount;
                    // Calculate percents based on amounts if not provided
                    if (totalParticipantPercent === 0) {
                        creatorPercent = (creatorAmount / Number(amount)) * 100;
                        // Backfill percents for participants
                        participantsData.forEach(p => {
                            if (p.shareAmount) {
                                p.sharePercent = (Number(p.shareAmount) / Number(amount)) * 100;
                            }
                        });
                    } else {
                        creatorPercent = 100 - totalParticipantPercent;
                    }
                }
                // If using only percents
                else if (totalParticipantPercent > 0) {
                    creatorPercent = 100 - totalParticipantPercent;
                    creatorAmount = (creatorPercent / 100) * Number(amount);
                    // Backfill amounts for participants
                    participantsData.forEach(p => {
                        if (p.sharePercent) {
                            p.shareAmount = (Number(p.sharePercent) / 100) * Number(amount);
                        }
                    });
                }
            } else {
                // Equal Split Fallback
                // Dynamic Split Logic: Only active participants pay initially
                const activeParticipantsCount = 1 + participants.filter(p => !p.userId).length; // Creator + Ad-hoc

                creatorAmount = Number(amount) / activeParticipantsCount;
                creatorPercent = 100 / activeParticipantsCount;

                // Update participants
                participantsData.forEach(p => {
                    if (p.userId) {
                        // Pending user -> 0 share
                        p.shareAmount = 0;
                        p.sharePercent = 0;
                    } else {
                        // Ad-hoc user -> Equal share
                        p.shareAmount = creatorAmount;
                        p.sharePercent = creatorPercent;
                    }
                });
            }

            // Add creator as participant
            participantsData.push({
                transactionId: transaction.id,
                userId: userId,
                shareAmount: creatorAmount,
                sharePercent: creatorPercent,
                status: ParticipantStatus.ACCEPTED
            });

            await this.prisma.transactionParticipant.createMany({
                data: participantsData
            });

            // Notify registered participants
            for (const p of participants) {
                if (p.userId) {
                    await this.notificationsService.create(
                        p.userId,
                        'transaction_invitation',
                        'Shared Transaction Invitation',
                        `${transaction.creator.name} invited you to split an expense: ${transaction.description || 'No description'} on ${transactionDate.toLocaleDateString('pt-BR')}`,
                        { transactionId: transaction.id }
                    );
                }
            }
        }

        return transaction;
    }

    async findAll(userId: string, filters?: { month?: number; year?: number; type?: TransactionType }) {
        const userAccessFilter: Prisma.TransactionWhereInput = {
            OR: [
                { creatorId: userId },
                {
                    participants: {
                        some: {
                            userId,
                            status: { notIn: [ParticipantStatus.REJECTED, ParticipantStatus.EXITED] }
                        }
                    }
                }
            ]
        };

        const where: Prisma.TransactionWhereInput = {
            AND: [userAccessFilter]
        };

        if (filters?.type) {
            where.type = filters.type;
        }

        if (filters?.month || filters?.year) {
            const now = new Date();
            const targetYear = filters.year || now.getFullYear();
            let startDate: Date;
            let endDate: Date;

            if (filters.month) {
                startDate = new Date(targetYear, filters.month - 1, 1);
                endDate = new Date(targetYear, filters.month, 0);
            } else {
                startDate = new Date(targetYear, 0, 1);
                endDate = new Date(targetYear, 11, 31);
            }

            // Logic: (Date in range) OR (isFixed AND Date <= endDate)
            (where.AND as Prisma.TransactionWhereInput[]).push({
                OR: [
                    {
                        date: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    {
                        AND: [
                            { isFixed: true },
                            { date: { lte: endDate } }
                        ]
                    }
                ]
            });
        }

        return this.prisma.transaction.findMany({
            where,
            include: {
                category: true,
                installments: true,
                participants: { include: { user: { select: { name: true, username: true } } } }
            },
            orderBy: { date: 'desc' }
        });
    }

    async findOne(id: string, userId: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id },
            include: {
                category: true,
                installments: true,
                participants: { include: { user: { select: { name: true, username: true } } } },
                creator: { select: { name: true } }
            }
        });

        if (!transaction) throw new NotFoundException('Transaction not found');

        // Check access
        const isParticipant = transaction.participants.some(p => p.userId === userId);
        if (transaction.creatorId !== userId && !isParticipant) {
            throw new NotFoundException('Transaction not found');
        }

        return transaction;
    }

    async remove(id: string, userId: string) {
        const transaction = await this.findOne(id, userId);
        if (transaction.creatorId !== userId) {
            throw new NotFoundException('Only creator can delete');
        }
        return this.prisma.transaction.delete({ where: { id } });
    }

    async exportToCsv(userId: string) {
        const transactions = await this.prisma.transaction.findMany({
            where: {
                OR: [
                    { creatorId: userId },
                    { participants: { some: { userId } } }
                ]
            },
            include: { category: true },
            orderBy: { date: 'desc' },
        });

        const data = transactions.map((t) => ({
            Date: t.date.toISOString().split('T')[0],
            Description: t.description,
            Amount: t.amount,
            Type: t.type,
            Category: t.category.name,
            Shared: t.isShared ? 'Yes' : 'No',
        }));

        const { Parser } = require('json2csv');
        const json2csvParser = new Parser();
        return json2csvParser.parse(data);
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

        // Dynamic Split Recalculation
        // If the user accepted and had 0 share (meaning they were pending in a dynamic split), recalculate.
        if (status === ParticipantStatus.ACCEPTED && Number(participant.shareAmount) === 0) {
            await this.recalculateDynamicShares(transaction.id);
        }

        // Notify Creator
        console.log(`[respondToInvitation] CreatorId: ${transaction.creatorId}, UserId: ${userId}, Status: ${status}`);
        if (transaction.creatorId !== userId) {
            const action = status === ParticipantStatus.ACCEPTED ? 'accepted' : 'rejected';
            console.log(`[respondToInvitation] Sending ${action} notification to creator ${transaction.creatorId}`);
            await this.notificationsService.create(
                transaction.creatorId,
                'transaction_update',
                'Transaction Update',
                `${participant.user?.name || 'A participant'} ${action} the shared transaction: ${transaction.description || 'No description'}`,
                { transactionId: transaction.id }
            );
        }

        // Notify other ACCEPTED participants
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

        // Check if any active participants remain (excluding creator)
        // We check the list BEFORE the update, but we know the current one is now REJECTED/ACCEPTED
        // Actually, we just updated the status in the DB above. So we can query or filter the in-memory list if we update it.
        // Let's re-fetch or just filter the existing list and account for the change.

        const remainingActiveParticipants = transaction.participants.filter(p =>
            p.userId !== transaction.creatorId &&
            p.userId !== userId && // Exclude the current user (who just responded)
            (p.status === ParticipantStatus.PENDING || p.status === ParticipantStatus.ACCEPTED)
        );

        // If the current user accepted, they are active. If rejected, they are not.
        const isCurrentUserActive = status === ParticipantStatus.ACCEPTED;

        if (remainingActiveParticipants.length === 0 && !isCurrentUserActive) {
            await this.prisma.transaction.update({
                where: { id: transaction.id },
                data: { isShared: false }
            });

            // Notify Creator about conversion to normal
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

        // Update status to EXITED
        await this.prisma.transactionParticipant.update({
            where: { id: participant.id },
            data: { status: ParticipantStatus.EXITED, shareAmount: 0, sharePercent: 0 }
        });

        // If they had a share, we might need to redistribute.
        if (Number(participant.shareAmount) > 0) {
            await this.recalculateDynamicShares(transaction.id);
        }

        // Notify Creator
        if (transaction.creatorId !== userId) {
            await this.notificationsService.create(
                transaction.creatorId,
                'transaction_update',
                'Participant Left',
                `${participant.user?.name || 'A participant'} left the shared transaction: ${transaction.description || 'No description'}`,
                { transactionId: transaction.id }
            );
        }

        // Notify other ACCEPTED participants
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

        // Check if any active participants remain (excluding creator)
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

            // Notify Creator about conversion to normal
            await this.notificationsService.create(
                transaction.creatorId,
                'transaction_update',
                'Transaction Converted',
                `Your transaction "${transaction.description || 'No description'}" is no longer shared because all participants rejected or left.`,
                { transactionId: transaction.id }
            );
        }
    }


    async update(id: string, userId: string, dto: UpdateTransactionDto) {
        const { amount, date, participants, categoryName, categoryId, isFixed, installmentsCount, ...rest } = dto;
        const transaction = await this.findOne(id, userId);

        if (transaction.creatorId !== userId) {
            throw new NotFoundException('Only creator can update');
        }

        let finalCategoryId = transaction.categoryId;

        if (categoryName) {
            let category = await this.prisma.category.findFirst({
                where: {
                    name: { equals: categoryName, mode: 'insensitive' },
                    OR: [{ userId: userId }, { isSystem: true }]
                }
            });

            if (!category) {
                category = await this.prisma.category.create({
                    data: { name: categoryName, userId: userId, isSystem: false }
                });
            }
            finalCategoryId = category.id;
        } else if (categoryId) {
            finalCategoryId = categoryId;
        }

        const transactionDate = date ? new Date(date) : transaction.date;
        const newAmount = amount !== undefined ? Number(amount) : Number(transaction.amount);
        const isCriticalUpdate =
            (amount !== undefined && Number(amount) !== Number(transaction.amount)) ||
            (date !== undefined && new Date(date).getTime() !== transaction.date.getTime()) ||
            (dto.description !== undefined && dto.description !== transaction.description);

        // Update Transaction Basic Info
        await this.prisma.transaction.update({
            where: { id },
            data: {
                ...rest,
                amount: newAmount,
                date: transactionDate,
                categoryId: finalCategoryId,
                isFixed: isFixed !== undefined ? isFixed : transaction.isFixed,
                isShared: participants && participants.length > 0 ? true : (participants ? false : transaction.isShared)
            }
        });

        // Handle Participants
        if (participants) {
            const dbParticipants = transaction.participants.filter(p => p.userId !== transaction.creatorId);
            const keptParticipantIds = new Set<string>();
            const participantsToUpdate: any[] = [];
            const participantsToCreate: any[] = [];

            // 1. Identify participants to keep/update/create
            for (const p of participants) {
                // Try to find existing participant by ID first
                let existingParticipant = p.id ? transaction.participants.find(ep => ep.id === p.id) : undefined;

                // Fallback: Try to find by userId if not found by ID
                if (!existingParticipant && p.userId) {
                    existingParticipant = transaction.participants.find(ep => ep.userId === p.userId);
                }

                if (existingParticipant) {
                    keptParticipantIds.add(existingParticipant.id);
                    participantsToUpdate.push({ existing: existingParticipant, dto: p });
                } else {
                    participantsToCreate.push(p);
                }
            }

            // 2. Remove participants that are NOT in the kept list
            const removedParticipantIds = dbParticipants
                .filter(p => !keptParticipantIds.has(p.id))
                .map(p => p.id);

            if (removedParticipantIds.length > 0) {
                // Fetch details for notification before deleting
                const removedParticipants = await this.prisma.transactionParticipant.findMany({
                    where: { id: { in: removedParticipantIds } },
                    include: { user: true }
                });

                await this.prisma.transactionParticipant.deleteMany({
                    where: { id: { in: removedParticipantIds } }
                });

                // Notify removed users
                for (const p of removedParticipants) {
                    if (p.userId) {
                        await this.notificationsService.create(
                            p.userId,
                            'transaction_update',
                            'Removed from Transaction',
                            `You were removed from the transaction: ${transaction.description || 'No description'}`,
                            { transactionId: id }
                        );
                    }
                }
            }

            // 3. Update existing participants
            for (const { existing, dto: p } of participantsToUpdate) {
                const shareAmount = p.amount !== undefined ? Number(p.amount) : Number(existing.shareAmount);
                const sharePercent = p.percent !== undefined ? Number(p.percent) : Number(existing.sharePercent);

                const isCriticalParticipantUpdate =
                    shareAmount !== Number(existing.shareAmount) ||
                    sharePercent !== Number(existing.sharePercent);

                const shouldResetStatus = isCriticalUpdate || isCriticalParticipantUpdate;

                await this.prisma.transactionParticipant.update({
                    where: { id: existing.id },
                    data: {
                        shareAmount: shareAmount,
                        sharePercent: sharePercent,
                        status: shouldResetStatus ? ParticipantStatus.PENDING : existing.status
                    }
                });

                if (shouldResetStatus && existing.userId) {
                    await this.notificationsService.create(
                        existing.userId,
                        'transaction_update',
                        'Transaction Updated',
                        `${transaction.creator.name} modificou valores da transação "${transaction.description}". Você aceita esta atualização?`,
                        { transactionId: id }
                    );
                }
            }

            // 4. Create new participants
            for (const p of participantsToCreate) {
                await this.prisma.transactionParticipant.create({
                    data: {
                        transactionId: id,
                        userId: p.userId,
                        placeholderName: p.userId ? undefined : p.name,
                        shareAmount: Number(p.amount),
                        sharePercent: Number(p.percent),
                        status: p.userId ? ParticipantStatus.PENDING : ParticipantStatus.ACCEPTED
                    }
                });

                if (p.userId) {
                    await this.notificationsService.create(
                        p.userId,
                        'transaction_invitation',
                        'Shared Transaction Invitation',
                        `${transaction.creator.name} invited you to split an expense: ${transaction.description || 'No description'}`,
                        { transactionId: id }
                    );
                }
            }
        } else if (isCriticalUpdate) {
            // If participants list wasn't sent but critical info changed, reset all existing participants
            const participantsToReset = transaction.participants.filter(p => p.userId !== userId);
            for (const p of participantsToReset) {
                await this.prisma.transactionParticipant.update({
                    where: { id: p.id },
                    data: { status: ParticipantStatus.PENDING }
                });

                if (p.userId) {
                    await this.notificationsService.create(
                        p.userId,
                        'transaction_update',
                        'Transaction Updated',
                        `The transaction "${transaction.description}" has been updated. Please review and accept/reject again.`,
                        { transactionId: id }
                    );
                }
            }
        }

        return this.findOne(id, userId);
    }

    private async recalculateDynamicShares(transactionId: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { participants: true }
        });

        if (!transaction) return;

        // Find all ACCEPTED participants
        const activeParticipants = transaction.participants.filter(p => p.status === ParticipantStatus.ACCEPTED);

        if (activeParticipants.length === 0) return;

        const newShare = Number(transaction.amount) / activeParticipants.length;
        const newPercent = 100 / activeParticipants.length;

        // Update all active participants
        await this.prisma.transactionParticipant.updateMany({
            where: {
                transactionId: transactionId,
                status: ParticipantStatus.ACCEPTED
            },
            data: {
                shareAmount: newShare,
                sharePercent: newPercent
            }
        });
    }
}

