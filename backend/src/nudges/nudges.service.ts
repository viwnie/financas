import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NudgeLog } from '@prisma/client';

@Injectable()
export class NudgesService {
    private readonly logger = new Logger(NudgesService.name);

    constructor(private prisma: PrismaService) { }

    async generateNudges(userId: string): Promise<any[]> {
        // 1. Check Budgets
        const budgetNudges = await this.checkBudgets(userId);

        // 2. Check Goals (Placeholder for now)
        // const goalNudges = await this.checkGoals(userId);

        const allNudges = [...budgetNudges];

        // TODO: Persist these to NudgeLog so we don't show duplicates?
        // For now, returning dynamic list for the UI.
        return allNudges;
    }

    private async checkBudgets(userId: string) {
        const activeBudgets = await this.prisma.budget.findMany({
            where: { userId },
            include: { category: true }
        });

        const nudges: {
            type: string;
            title: string;
            message: string;
            severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
            scope: string;
            categoryId?: string;
        }[] = [];

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Re-fetching full budget objects with Category Info correctly
        const enrichedBudgets = await this.prisma.budget.findMany({
            where: { userId },
            include: {
                category: { include: { translations: true } }
            }
        });

        for (const budget of enrichedBudgets) {
            // Calculate spending for this category in current month
            const transactions = await this.prisma.transaction.findMany({
                where: {
                    creatorId: userId,
                    categoryId: budget.categoryId,
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    },
                    type: 'EXPENSE'
                }
            });

            const totalSpent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
            const limit = Number(budget.amount);
            const percentage = (totalSpent / limit) * 100;

            // Access name via translation (assuming first one, or specific language logic)
            // Since we included 'category', we need to check if translations are loaded.
            // Usually findMany includes need to be explicit.
            // Let's refactor findMany to include translations in getActiveNudges.
            // ... Wait, 'budgets' were fetched in separate service call?
            // In NudgesService line 33, we have `const budgets = ...`. We need to include category.translations there.

            // Since I can't see the `budgets` fetch line here easily, I'll assume we need to modify how we access the name
            // AND likely how we fetch it.
            const categoryName = budget.category?.translations[0]?.name || 'Category';

            if (percentage >= 100) {
                nudges.push({
                    type: 'BUDGET_EXCEEDED',
                    title: 'Budget Alert',
                    message: `You've exceeded your ${categoryName} budget by ${(percentage - 100).toFixed(0)}%.`,
                    severity: 'CRITICAL',
                    scope: 'CATEGORY',
                    categoryId: budget.categoryId
                });
            } else if (percentage >= 80) {
                nudges.push({
                    type: 'BUDGET_WARNING',
                    title: 'Heads up!',
                    message: `You've used ${percentage.toFixed(0)}% of your ${categoryName} budget.`,
                    severity: 'WARNING',
                    scope: 'CATEGORY',
                    categoryId: budget.categoryId
                });
            }
        }
        return nudges;
    }
}
