import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateBudgetDto } from './create-budget.dto'; // We will create this
import { UpdateBudgetDto } from './update-budget.dto'; // We will create this

@Injectable()
export class BudgetsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, createBudgetDto: CreateBudgetDto) {
        // Check if budget for category already exists
        const existing = await this.prisma.budget.findUnique({
            where: {
                userId_categoryId_period: {
                    userId,
                    categoryId: createBudgetDto.categoryId,
                    period: createBudgetDto.period || 'MONTHLY'
                }
            }
        });

        if (existing) {
            // Update functionality or throw error? Let's update for convenience or throw.
            // For now, throw or update. Let's simple create.
            return this.prisma.budget.update({
                where: { id: existing.id },
                data: { amount: createBudgetDto.amount }
            });
        }

        return this.prisma.budget.create({
            data: {
                userId,
                ...createBudgetDto,
                period: createBudgetDto.period || 'MONTHLY'
            },
        });
    }

    async findAll(userId: string) {
        return this.prisma.budget.findMany({
            where: { userId },
            include: { category: true },
        });
    }

    async findOne(id: string, userId: string) {
        return this.prisma.budget.findFirst({
            where: { id, userId },
            include: { category: true }
        });
    }

    async update(id: string, userId: string, updateBudgetDto: UpdateBudgetDto) {
        return this.prisma.budget.updateMany({
            where: { id, userId },
            data: updateBudgetDto
        });
    }

    async remove(id: string, userId: string) {
        return this.prisma.budget.deleteMany({
            where: { id, userId }
        });
    }

    async getBudgetStatus(userId: string) {
        const budgets = await this.findAll(userId);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const statusList: {
            budget: any; // Using any for now to avoid deep type issues with Prisma includes
            totalSpent: number;
            limit: number;
            percentage: number;
            color: 'GREEN' | 'YELLOW' | 'RED';
        }[] = [];

        for (const budget of budgets) {
            const transactions = await this.prisma.transaction.findMany({
                where: {
                    creatorId: userId,
                    categoryId: budget.categoryId,
                    date: { gte: startOfMonth, lte: endOfMonth },
                    type: 'EXPENSE'
                }
            });

            const totalSpent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
            const limit = Number(budget.amount);
            const percentage = (totalSpent / limit) * 100;

            statusList.push({
                budget,
                totalSpent,
                limit,
                percentage,
                color: this.determineColor(percentage)
            });
        }

        return statusList;
    }

    private determineColor(percentage: number): 'GREEN' | 'YELLOW' | 'RED' {
        if (percentage >= 100) return 'RED';
        if (percentage >= 80) return 'YELLOW';
        return 'GREEN';
    }
}
