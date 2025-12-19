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

    async findAll(userId: string, filters?: { months?: number[]; years?: number[]; type?: TransactionType; search?: string }) {
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

        if (filters?.search) {
            (where.AND as Prisma.TransactionWhereInput[]).push({
                OR: [
                    { description: { contains: filters.search, mode: 'insensitive' } },
                    {
                        category: {
                            OR: [
                                { name: { contains: filters.search, mode: 'insensitive' } }, // Original name
                                {
                                    translations: {
                                        some: {
                                            name: { contains: filters.search, mode: 'insensitive' } // Translated name
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            });
        }

        // Date Filtering Logic for Multiple Months/Years
        // Strategy:
        // 1. If only years provided: Filter by those years (Jan 1 to Dec 31).
        // 2. If months and years provided:
        //    Ideally, we want "all selected months in all selected years". 
        //    E.g. Month=[1, 2], Year=[2024, 2025] -> Jan 2024, Feb 2024, Jan 2025, Feb 2025.
        // 3. If only months provided (no years): Assume current year (standard behavior) or ignore? 
        //    Let's default to current year if no year provided but months are.

        if (filters?.months?.length || filters?.years?.length) {
            const targetYears = filters.years?.length ? filters.years : [new Date().getFullYear()];
            const targetMonths = filters.months?.length ? filters.months : Array.from({ length: 12 }, (_, i) => i + 1); // If year selected but no month, imply *all* months? Or no filter? Usually "Year 2024" means all 2024.

            // Construct ranges
            const ranges: { start: Date; end: Date }[] = [];

            for (const year of targetYears) {
                if (filters?.months?.length) {
                    // Specific months in this year
                    for (const month of filters.months) {
                        ranges.push({
                            start: new Date(year, month - 1, 1),
                            end: new Date(year, month, 0)
                        });
                    }
                } else {
                    // Whole year
                    ranges.push({
                        start: new Date(year, 0, 1),
                        end: new Date(year, 11, 31)
                    });
                }
            }

            const rangeConditions = ranges.map(range => ({
                date: {
                    gte: range.start,
                    lte: range.end
                }
            }));

            // Fixed transactions logic:
            // A fixed transaction should show up if it is active during ANY of the target ranges.
            // Active means:
            // 1. isFixed = true
            // 2. date (start date) <= range.end
            // 3. recurrenceEndsAt IS NULL OR recurrenceEndsAt >= range.start

            const fixedConditions = ranges.map(range => ({
                AND: [
                    { isFixed: true },
                    { date: { lte: range.end } },
                    {
                        OR: [
                            { recurrenceEndsAt: null },
                            { recurrenceEndsAt: { gte: range.start } }
                        ]
                    }
                ]
            }));

            (where.AND as Prisma.TransactionWhereInput[]).push({
                OR: [
                    ...rangeConditions,
                    ...fixedConditions
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

        // Post-processing for Fixed Transactions display dates
        // We need to flatten fixed transactions into their occurrences within the selected ranges.
        // For standard transactions, we just return them.
        // For fixed transactions, we might duplicate them if they appear in multiple selected months (e.g. Jan and Feb selected).

        const result: any[] = [];
        const ranges = (filters?.months?.length || filters?.years?.length)
            ? (filters.years?.length ? filters.years : [new Date().getFullYear()]).flatMap(y =>
                (filters.months?.length ? filters.months : Array.from({ length: 12 }, (_, i) => i + 1)).map(m => ({ year: y, month: m - 1 }))
            )
            : []; // If no filter, we probably shouldn't be here or just show all? The original code defaulted to a specific month/year.
        // If the user clears filters, we might want to default to something or show everything (pagination needed then).
        // For now, if no ranges (empty filters), we just return the raw transactions (like "All Time").

        // If we have ranges defined, we "explode" fixed transactions.
        if (ranges.length > 0) {
            for (const t of transactions) {
                if (t.isFixed) {
                    // Check which ranges this fixed transaction falls into
                    let added = false;
                    for (const range of ranges) {
                        const rangeStart = new Date(range.year, range.month, 1);
                        const rangeEnd = new Date(range.year, range.month + 1, 0);

                        // Check if active in this range
                        const isActive = t.date <= rangeEnd && (!t.recurrenceEndsAt || t.recurrenceEndsAt >= rangeStart);

                        if (isActive) {
                            // Calculate display date for this specific month/year occurrence
                            // Logic: Match day of month, or clamp.
                            const originalDay = t.date.getDate();
                            const daysInTargetMonth = rangeEnd.getDate(); // rangeEnd is last day of month
                            const targetDay = Math.min(originalDay, daysInTargetMonth);
                            const displayDate = new Date(range.year, range.month, targetDay);
                            displayDate.setHours(t.date.getHours(), t.date.getMinutes(), t.date.getSeconds(), t.date.getMilliseconds());

                            // Check Exclusions for THIS specific date
                            const isExcluded = t.excludedDates.some(ex => {
                                const exDate = new Date(ex);
                                return exDate.getFullYear() === displayDate.getFullYear() &&
                                    exDate.getMonth() === displayDate.getMonth() &&
                                    exDate.getDate() === displayDate.getDate();
                            });

                            if (!isExcluded) {
                                // Clone and push
                                result.push({
                                    ...t,
                                    date: displayDate,
                                    originalDate: t.date,
                                    category: {
                                        ...t.category,
                                        color: t.category.userSettings[0]?.color || null,
                                        name: t.category.translations[0]?.name || 'Unnamed'
                                    }
                                });
                                added = true;
                            }
                        }
                    }
                    // What if it's fixed but doesn't fall in any displayed range? (Should be filtered out by DB query, but double check)
                } else {
                    // Regular transaction
                    result.push({
                        ...t,
                        category: {
                            ...t.category,
                            color: t.category.userSettings[0]?.color || null,
                            name: t.category.translations[0]?.name || 'Unnamed'
                        }
                    });
                }
            }
        } else {
            // No time filters, just map standard props
            return transactions.map(t => ({
                ...t,
                category: {
                    ...t.category,
                    color: t.category.userSettings[0]?.color || null,
                    name: t.category.translations[0]?.name || 'Unnamed'
                }
            }));
        }

        // Sort again because we might have generated out-of-order occurrences
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
