import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DateHelper } from '../common/utils/date.helper';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(private prisma: PrismaService) { }

    async getStats(userId: string, month: number, year: number) {
        this.logger.log(`Fetching dashboard stats for user ${userId}, month: ${month}, year: ${year}`);
        const { startDate, endDate } = DateHelper.getMonthRange(year, month);
        const { startDate: lastMonthStart, endDate: lastMonthEnd } = DateHelper.getMonthRange(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);

        const [transactions, lastMonthTransactions] = await Promise.all([
            this.prisma.transaction.findMany({
                where: {
                    date: { gte: startDate, lte: endDate },
                    OR: [
                        { creatorId: userId },
                        { participants: { some: { userId, status: 'ACCEPTED' } } }
                    ]
                },
                include: { participants: true }
            }),
            this.prisma.transaction.findMany({
                where: {
                    date: { gte: lastMonthStart, lte: lastMonthEnd },
                    OR: [
                        { creatorId: userId },
                        { participants: { some: { userId, status: 'ACCEPTED' } } }
                    ]
                },
                include: { participants: true }
            })
        ]);

        const current = this.calculateTotals(transactions, userId);
        const last = this.calculateTotals(lastMonthTransactions, userId);

        const calculateVariation = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        const categories = await this.calculateCategoryTotals(transactions, userId);

        return {
            income: {
                total: current.income,
                variation: calculateVariation(current.income, last.income)
            },
            expense: {
                total: current.expense,
                variation: calculateVariation(current.expense, last.expense)
            },
            balance: {
                total: current.income - current.expense,
                variation: calculateVariation(current.income - current.expense, last.income - last.expense)
            },
            expensesByCategory: categories
        };
    }

    async getEvolution(userId: string, year: number) {
        this.logger.log(`Fetching evolution stats for user ${userId}, year: ${year}`);
        const { startDate, endDate } = DateHelper.getYearRange(year);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                date: { gte: startDate, lte: endDate },
                OR: [
                    { creatorId: userId },
                    { participants: { some: { userId, status: 'ACCEPTED' } } }
                ]
            },
            include: { participants: true }
        });

        // Initialize months map
        const months = new Map<number, { income: number; expense: number }>();
        for (let i = 0; i < 12; i++) {
            months.set(i, { income: 0, expense: 0 });
        }

        for (const t of transactions) {
            const monthIndex = t.date.getMonth();
            const stats = months.get(monthIndex)!;
            const amount = this.calculateUserShare(t, userId);

            if (t.type === 'INCOME') {
                stats.income += amount;
            } else {
                stats.expense += amount;
            }
        }

        return Array.from(months.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([index, stats]) => ({
                month: index + 1, // Return 1-based month for frontend consistency
                ...stats,
                balance: stats.income - stats.expense
            }));
    }

    private calculateUserShare(transaction: any, userId: string): number {
        // If user is creator and no established participants, full amount
        // If shared, check if user is participant
        let amount = Number(transaction.amount);

        if (transaction.participants && transaction.participants.length > 0) {
            const participant = transaction.participants.find((p: any) => p.userId === userId);
            if (participant) {
                // If user is a participant (accepted or pending? check logic. Usually accepted matters for balance but pending might be relevant depending on rules. Sticking to Accepted filter in query mainly, but here we calculate share)
                // Note: The query filters for ACCEPTED or Creator.
                // If I am creator but not in participants list (e.g. paying for others? No, creator is usually participant).
                // Let's assume logic: if user is in participants list, use their share.
                return Number(participant.shareAmount || 0);
            } else if (transaction.creatorId === userId) {
                // I am creator, but not in participants list? Weird case for shared bill where I pay nothing?
                // Or I pay the remainder?
                // Simple logic: if not participant, 0 (assuming I assigned everything to others).
                // BUT, if it's a personal transaction (no participants), it falls here?
                // No, if participants > 0 check.
                return 0;
            }
        }

        // Personal transaction
        return amount;
    }

    private calculateTotals(transactions: any[], userId: string) {
        return transactions.reduce((acc, t) => {
            const amount = this.calculateUserShare(t, userId);
            if (t.type === 'INCOME') acc.income += amount;
            else acc.expense += amount;
            return acc;
        }, { income: 0, expense: 0 });
    }

    private async calculateCategoryTotals(transactions: any[], userId: string) {
        const expenses = transactions.filter(t => t.type === 'EXPENSE');
        const map = new Map<string, number>();

        for (const t of expenses) {
            const amount = this.calculateUserShare(t, userId);
            if (amount > 0 && t.categoryId) {
                map.set(t.categoryId, (map.get(t.categoryId) || 0) + amount);
            }
        }

        // We need category details (names/colors)
        // Ideally we fetch them. 
        if (map.size === 0) return [];

        const categoryIds = Array.from(map.keys());
        const categories = await this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            include: {
                userSettings: { where: { userId } },
                translations: true
            }
        });

        const totalExpense = Array.from(map.values()).reduce((a, b) => a + b, 0);

        return categories.map(cat => {
            const amount = map.get(cat.id) || 0;
            return {
                categoryId: cat.id,
                name: cat.translations[0]?.name || 'Unnamed', // Simplified for stats
                color: cat.userSettings[0]?.color || null,
                amount,
                percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
            };
        });


    }
}
