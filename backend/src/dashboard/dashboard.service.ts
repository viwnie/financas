import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getStats(userId: string) {
        // Existing logic or placeholder
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const income = await this.prisma.transaction.aggregate({
            where: { creatorId: userId, type: TransactionType.INCOME, date: { gte: startOfMonth, lte: endOfMonth } },
            _sum: { amount: true }
        });

        const expense = await this.prisma.transaction.aggregate({
            where: { creatorId: userId, type: TransactionType.EXPENSE, date: { gte: startOfMonth, lte: endOfMonth } },
            _sum: { amount: true }
        });

        // Pie Chart Data
        const expensesByCategory = await this.prisma.transaction.groupBy({
            by: ['categoryId'],
            where: { creatorId: userId, type: TransactionType.EXPENSE, date: { gte: startOfMonth, lte: endOfMonth } },
            _sum: { amount: true }
        });

        // Resolve Category Names (simplified)
        const categoryIds = expensesByCategory.map(e => e.categoryId);
        const categories = await this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            include: { translations: true, userSettings: { where: { userId } } }
        });

        const enrichedExpenses = expensesByCategory.map(e => {
            const cat = categories.find(c => c.id === e.categoryId);
            const name = cat?.translations[0]?.name || 'Unknown';
            const color = cat?.userSettings[0]?.color || '#ccc';

            return {
                ...e,
                amount: Number(e._sum.amount),
                name,
                color
            };
        });

        return {
            income: { total: Number(income._sum.amount) || 0 },
            expense: { total: Number(expense._sum.amount) || 0 },
            balance: { total: (Number(income._sum.amount) || 0) - (Number(expense._sum.amount) || 0) },
            expensesByCategory: enrichedExpenses
        };
    }

    async getEvolution(userId: string) {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const transactions = await this.prisma.transaction.findMany({
            where: {
                creatorId: userId,
                date: {
                    gte: sixMonthsAgo,
                    lte: endOfCurrentMonth,
                },
            },
            select: {
                date: true,
                type: true,
                amount: true,
            },
            orderBy: {
                date: 'asc',
            },
        });

        const evolutionMap = new Map<string, { income: number; expense: number; monthOrder: number }>();

        // Initialize last 6 months
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const monthKey = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
            // Use a sortable key like "YYYY-MM" to sort, but for this simplified view we just rely on loop order?
            // Actually, let's just push to an array.
        }

        // Better approach: Create the array of 6 months first
        const result: { month: string; income: number; expense: number; rawDate: Date }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).substring(0, 3).toUpperCase();
            result.push({
                month: monthLabel,
                income: 0,
                expense: 0,
                rawDate: d
            });
        }

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            // Find matching month in result
            const match = result.find(r =>
                r.rawDate.getMonth() === tDate.getMonth() &&
                r.rawDate.getFullYear() === tDate.getFullYear()
            );

            if (match) {
                if (t.type === TransactionType.INCOME) {
                    match.income += Number(t.amount);
                } else if (t.type === TransactionType.EXPENSE) {
                    match.expense += Number(t.amount);
                }
            }
        });

        // Cleanup rawDate before returning
        return result.map(({ rawDate, ...rest }) => rest);
    }

    async getComparison(userId: string) {
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const currentMonthExpense = await this.prisma.transaction.aggregate({
            where: {
                creatorId: userId,
                type: TransactionType.EXPENSE,
                date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
            },
            _sum: { amount: true }
        });

        const lastMonthExpense = await this.prisma.transaction.aggregate({
            where: {
                creatorId: userId,
                type: TransactionType.EXPENSE,
                date: { gte: startOfLastMonth, lte: endOfLastMonth }
            },
            _sum: { amount: true }
        });

        const current = Number(currentMonthExpense._sum.amount) || 0;
        const last = Number(lastMonthExpense._sum.amount) || 0;

        let percentageChange = 0;
        if (last === 0) {
            percentageChange = current > 0 ? 100 : 0;
        } else {
            percentageChange = ((current - last) / last) * 100;
        }

        return {
            currentMonthSpent: current,
            lastMonthSpent: last,
            percentageChange
        };
    }
}
