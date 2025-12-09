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


        await this.transactionInstallmentsService.createInstallments(transaction.id, amount, installmentsCount, transactionDate);


        await this.transactionParticipantsService.handleParticipantsCreation(transaction, participants, amount, transactionDate);

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
                participants: { include: { user: { select: { name: true, username: true } } } }
            },
            orderBy: { date: 'desc' }
        });

        return transactions.map(t => ({
            ...t,
            category: {
                ...t.category,
                color: t.category.userSettings[0]?.color || null,
                name: t.category.translations[0]?.name || 'Unnamed' // Fallback
            }
        }));
    }

    async findOne(id: string, userId: string) {
        const transaction = await this.prisma.transaction.findUnique({
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
        const { amount, date, participants, categoryName, categoryId, isFixed, installmentsCount, ...rest } = dto;
        const transaction = await this.findOne(id, userId);

        if (transaction.creatorId !== userId) {
            throw new NotFoundException('Only creator can update');
        }

        let finalCategoryId = transaction.categoryId;
        if (categoryName || categoryId) {
            // Note: Update DTO doesn't have language yet, but we can default to 'pt' or add it to UpdateDto if needed.
            // For now, let's assume 'pt' or if we want to support it in update, we need to add it to UpdateTransactionDto.
            // Since the user didn't explicitly ask for update support, I'll default to 'pt' or check if dto has it (if I add it there too).
            // Actually, let's check if I should add it to UpdateTransactionDto.
            // For now, I'll just pass 'pt' as default or undefined to let service handle it.
            // But wait, resolveCategory signature changed.
            finalCategoryId = await this.transactionCategoryHelperService.resolveCategory(userId, categoryId || transaction.categoryId, categoryName, undefined, (dto as any).language);
        }

        const transactionDate = date ? new Date(date) : transaction.date;
        const newAmount = amount !== undefined ? Number(amount) : Number(transaction.amount);
        const isCriticalUpdate =
            (amount !== undefined && Number(amount) !== Number(transaction.amount)) ||
            (date !== undefined && new Date(date).getTime() !== transaction.date.getTime()) ||
            (dto.description !== undefined && dto.description !== transaction.description) ||
            (finalCategoryId !== transaction.categoryId);


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


        await this.transactionParticipantsService.handleParticipantsUpdate(transaction, participants, isCriticalUpdate);

        return this.findOne(id, userId);
    }
}
