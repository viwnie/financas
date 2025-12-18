import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType, InstallmentStatus, ParticipantStatus, Prisma } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CategoriesService } from '../categories/categories.service';

import { TransactionSharesService } from './transaction-shares.service';
import { TransactionExportService } from './transaction-export.service';

import { TransactionCategoryHelperService } from './transaction-category-helper.service';
import { TransactionInstallmentsService } from './transaction-installments.service';
import { TransactionParticipantsService } from './transaction-participants.service';

@Injectable()
export class TransactionsService {
    constructor(
        private prisma: PrismaService,
        private notificationsGateway: NotificationsGateway,
        private notificationsService: NotificationsService,
        private categoriesService: CategoriesService,
        private transactionSharesService: TransactionSharesService,
        private transactionExportService: TransactionExportService,
        private transactionCategoryHelperService: TransactionCategoryHelperService,
        private transactionInstallmentsService: TransactionInstallmentsService,
        private transactionParticipantsService: TransactionParticipantsService
    ) { }

    async create(userId: string, dto: CreateTransactionDto) {
        const { amount, date, installmentsCount, participants, categoryName, categoryId, categoryColor, language, isFixed, ...rest } = dto;
        const transactionDate = new Date(date);

        const finalCategoryId = await this.transactionCategoryHelperService.resolveCategory(userId, categoryId, categoryName, categoryColor, language);

        return this.prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.create({
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

            await this.transactionInstallmentsService.createInstallments(transaction.id, amount, installmentsCount, transactionDate, tx);

            await this.transactionParticipantsService.handleParticipantsCreation(transaction, participants, amount, transactionDate, tx);

            return transaction;
        });
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
                            { date: { lte: endDate } },
                            {
                                OR: [
                                    { recurrenceEndsAt: null },
                                    { recurrenceEndsAt: { gte: startDate } }
                                ]
                            }
                        ]
                    }
                ]
            });
        }

        const transactions = await this.prisma.transaction.findMany({
            where,
            include: {
                category: {
                    include: {
                        userSettings: {
                            where: { userId }
                        },
                        translations: true
                    }
                },
                installments: true,
                participants: { include: { user: { select: { name: true, username: true, avatarMimeType: true } } } }
            },
            orderBy: { date: 'desc' }
        });

        return transactions.map(t => {
            let displayDate = t.date;
            if (filters?.month && filters?.year && t.isFixed) {
                const targetYear = filters.year;
                const targetMonth = filters.month - 1; // 0-indexed
                // Check if original date is not in the target month/year
                if (t.date.getMonth() !== targetMonth || t.date.getFullYear() !== targetYear) {
                    // Create date in target month
                    // Handle edge cases like Jan 31 -> Feb 28 using simple date setting?
                    // new Date(y, m, d) automatically rolls over if d > daysInMonth, which might not be desired (Jan 31 -> Mar 3).
                    // Better to clamp to last day of month.
                    const originalDay = t.date.getDate();
                    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
                    const targetDay = Math.min(originalDay, daysInTargetMonth);
                    displayDate = new Date(targetYear, targetMonth, targetDay);

                    // Preserve time? Usually irrelevant for transactions but good practice
                    displayDate.setHours(t.date.getHours(), t.date.getMinutes(), t.date.getSeconds(), t.date.getMilliseconds());
                }
            }

            // Check exclusions
            // We match based on Year-Month-Day to be safe, or exact time if robust
            // Since excludedDates will be stored with same time as t.date (from frontend logic ideally), exact match might work.
            // But robust way: checks if any excluded date falls on same day as displayDate.
            const isExcluded = t.excludedDates.some(ex => {
                const exDate = new Date(ex);
                return exDate.getFullYear() === displayDate.getFullYear() &&
                    exDate.getMonth() === displayDate.getMonth() &&
                    exDate.getDate() === displayDate.getDate();
            });

            if (isExcluded) return null;

            return {
                ...t,
                date: displayDate, // Override correct date for the view
                originalDate: t.date, // Keep original just in case
                category: {
                    ...t.category,
                    color: t.category.userSettings[0]?.color || null,
                    name: t.category.translations[0]?.name || 'Unnamed' // Fallback
                }
            };
        }).filter(Boolean); // Remove nulls
    }

    async remove(id: string, userId: string) {
        const transaction = await this.findOne(id, userId);
        if (transaction.creatorId !== userId) {
            throw new NotFoundException('Only creator can delete');
        }
        return this.prisma.transaction.delete({ where: { id } });
    }

    async exportToCsv(userId: string) {
        return this.transactionExportService.exportToCsv(userId);
    }

    async update(id: string, userId: string, dto: UpdateTransactionDto) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const fs = require('fs');
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const path = require('path');
            fs.appendFileSync(path.join(process.cwd(), 'backend_debug_log.txt'), 'Update DTO: ' + JSON.stringify(dto) + '\n');
        } catch (e) {
            console.error('Failed to log', e);
        }

        const { amount, date, participants, categoryName, categoryId, isFixed, installmentsCount, categoryColor, language, ...rest } = dto;
        const transaction = await this.findOne(id, userId);

        if (transaction.creatorId !== userId) {
            throw new NotFoundException('Only creator can update');
        }

        let finalCategoryId = transaction.categoryId;
        if (categoryName || categoryId) {
            finalCategoryId = await this.transactionCategoryHelperService.resolveCategory(userId, categoryId || transaction.categoryId, categoryName, categoryColor, language);
        }

        const transactionDate = date ? new Date(date) : transaction.date;
        const newAmount = amount !== undefined ? Number(amount) : Number(transaction.amount);
        const isCriticalUpdate =
            (amount !== undefined && Number(amount) !== Number(transaction.amount)) ||
            (date !== undefined && new Date(date).getTime() !== transaction.date.getTime()) ||
            (dto.description !== undefined && dto.description !== transaction.description) ||
            (finalCategoryId !== transaction.categoryId);

        return this.prisma.$transaction(async (tx) => {
            await tx.transaction.update({
                where: { id },
                data: {
                    ...rest,
                    amount: newAmount,
                    date: transactionDate,
                    categoryId: finalCategoryId,
                    isFixed: (isFixed === true) ? true      // Explicitly enabled hard
                        : (isFixed === false) ? true     // Explicitly disabled -> forcing true to keep history
                            : transaction.isFixed,       // Not specified -> keep current

                    recurrenceEndsAt: dto.recurrenceEndsAt // If explicit date provided (by frontend picker), use it
                        ? new Date(dto.recurrenceEndsAt)
                        : (isFixed === false) // If turning off without date (legacy/default), set to now
                            ? new Date()
                            : (isFixed === true) // If turning ON, clear end date
                                ? null
                                : transaction.recurrenceEndsAt, // Else keep current

                    excludedDates: dto.excludedDates ? dto.excludedDates.map(d => new Date(d)) : undefined, // Replace list if provided

                    isShared: participants && participants.length > 0 ? true : (participants ? false : transaction.isShared)
                }
            });

            await this.transactionParticipantsService.handleParticipantsUpdate(transaction, participants, newAmount, isCriticalUpdate, tx);

            return this.findOne(id, userId, tx);
        });
    }

    // Overload findOne to accept tx
    async findOne(id: string, userId: string, tx?: Prisma.TransactionClient) {
        const client = tx || this.prisma;
        const transaction = await client.transaction.findUnique({
            where: { id },
            include: {
                category: {
                    include: {
                        userSettings: {
                            where: { userId }
                        },
                        translations: true
                    }
                },
                installments: true,
                participants: { include: { user: { select: { name: true, username: true } } } },
                creator: { select: { name: true } }
            }
        });

        if (!transaction) throw new NotFoundException('Transaction not found');


        const isParticipant = transaction.participants.some(p => p.userId === userId);
        if (transaction.creatorId !== userId && !isParticipant) {
            throw new NotFoundException('Transaction not found');
        }

        return {
            ...transaction,
            category: {
                ...transaction.category,
                color: transaction.category.userSettings[0]?.color || null,
                name: transaction.category.translations[0]?.name || 'Unnamed'
            }
        };
    }

    async respondAll(userId: string, status: ParticipantStatus) {
        const pending = await this.prisma.transactionParticipant.findMany({
            where: {
                userId,
                status: ParticipantStatus.PENDING
            },
            select: { transactionId: true }
        });

        const results: any[] = [];
        for (const p of pending) {
            try {
                await this.transactionParticipantsService.respondToInvitation(p.transactionId, userId, status);
                results.push({ id: p.transactionId, success: true });
            } catch (error) {
                results.push({ id: p.transactionId, success: false, error: error.message });
            }
        }
        return results;
    }
}
