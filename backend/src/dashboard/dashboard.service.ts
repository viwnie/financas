import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TransactionType, ParticipantStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getStats(userId: string) {
        // 1. Fetch non-shared transactions created by user
        const personalTransactions = await this.prisma.transaction.findMany({
            where: {
                creatorId: userId,
                isShared: false
            },
        });

        // 2. Fetch shared transactions where user is a participant (including creator as participant)
        // We only count ACCEPTED or PENDING (depending on business logic, usually ACCEPTED for stats)
        // For now, let's include ACCEPTED to be safe, or maybe PENDING if we want to show projected.
        // Usually dashboard shows what "is" or "will be" paid. Let's stick to ACCEPTED for confirmed stats, 
        // but if the user created it, they might want to see it immediately. 
        // However, the prompt says "accepted a shared purchase", implying status matters.
        // Let's filter by status: ACCEPTED for participants. For creator, they are auto-ACCEPTED.
        const sharedParticipations = await this.prisma.transactionParticipant.findMany({
            where: {
                userId: userId,
                status: ParticipantStatus.ACCEPTED,
                transaction: { isShared: true }
            },
            include: { transaction: true }
        });

        let totalIncome = 0;
        let totalExpense = 0;

        // Sum personal transactions
        personalTransactions.forEach(t => {
            const amount = Number(t.amount);
            if (t.type === TransactionType.INCOME) {
                totalIncome += amount;
            } else {
                totalExpense += amount;
            }
        });

        // Sum shared participations
        sharedParticipations.forEach(p => {
            const amount = Number(p.shareAmount);
            if (p.transaction.type === TransactionType.INCOME) {
                totalIncome += amount;
            } else {
                totalExpense += amount;
            }
        });

        const balance = totalIncome - totalExpense;

        // Calculate Expenses by Category
        // We need to aggregate manually since we have two sources
        const categoryMap = new Map<string, number>();

        // Helper to add to category map
        const addToCategory = (categoryId: string, amount: number) => {
            const current = categoryMap.get(categoryId) || 0;
            categoryMap.set(categoryId, current + amount);
        };

        personalTransactions.forEach(t => {
            if (t.type === TransactionType.EXPENSE) {
                addToCategory(t.categoryId, Number(t.amount));
            }
        });

        sharedParticipations.forEach(p => {
            if (p.transaction.type === TransactionType.EXPENSE) {
                addToCategory(p.transaction.categoryId, Number(p.shareAmount));
            }
        });

        // Enrich with category names
        const categoryStats = await Promise.all(Array.from(categoryMap.entries()).map(async ([categoryId, amount]) => {
            const category = await this.prisma.category.findUnique({
                where: { id: categoryId },
                include: { translations: true }
            });
            return {
                category: category?.translations?.[0]?.name || 'Unknown',
                amount: amount,
            };
        }));

        return {
            totalIncome,
            totalExpense,
            balance,
            categoryStats,
        };
    }

    async getEvolution(userId: string) {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 5);
        sixMonthsAgo.setDate(1); // Start of the month

        // 1. Personal Transactions
        const personalTransactions = await this.prisma.transaction.findMany({
            where: {
                creatorId: userId,
                isShared: false,
                date: { gte: sixMonthsAgo },
            },
            orderBy: { date: 'asc' },
        });

        // 2. Shared Participations
        const sharedParticipations = await this.prisma.transactionParticipant.findMany({
            where: {
                userId: userId,
                status: ParticipantStatus.ACCEPTED,
                transaction: {
                    isShared: true,
                    date: { gte: sixMonthsAgo }
                }
            },
            include: { transaction: true },
            orderBy: { transaction: { date: 'asc' } }
        });

        const evolutionMap = new Map<string, { month: string; income: number; expense: number }>();

        // Initialize last 6 months
        for (let i = 0; i < 6; i++) {
            const d = new Date(sixMonthsAgo);
            d.setMonth(d.getMonth() + i);
            const monthKey = d.toLocaleString('default', { month: 'short' });
            evolutionMap.set(monthKey, { month: monthKey, income: 0, expense: 0 });
        }

        // Process Personal
        personalTransactions.forEach(t => {
            const monthKey = t.date.toLocaleString('default', { month: 'short' });
            if (evolutionMap.has(monthKey)) {
                const entry = evolutionMap.get(monthKey)!;
                const amount = Number(t.amount);
                if (t.type === TransactionType.INCOME) {
                    entry.income += amount;
                } else {
                    entry.expense += amount;
                }
            }
        });

        // Process Shared
        sharedParticipations.forEach(p => {
            const t = p.transaction;
            const monthKey = t.date.toLocaleString('default', { month: 'short' });
            if (evolutionMap.has(monthKey)) {
                const entry = evolutionMap.get(monthKey)!;
                const amount = Number(p.shareAmount);
                if (t.type === TransactionType.INCOME) {
                    entry.income += amount;
                } else {
                    entry.expense += amount;
                }
            }
        });

        return Array.from(evolutionMap.values());
    }
}
