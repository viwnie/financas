import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SavingsGoalsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, data: Prisma.SavingsGoalCreateWithoutUserInput) {
        return this.prisma.savingsGoal.create({
            data: {
                ...data,
                userId,
            },
        });
    }

    async findAll(userId: string) {
        return this.prisma.savingsGoal.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(userId: string, id: string) {
        const goal = await this.prisma.savingsGoal.findFirst({
            where: { id, userId },
        });
        if (!goal) throw new NotFoundException('Savings Goal not found');
        return goal;
    }

    async update(userId: string, id: string, data: Prisma.SavingsGoalUpdateWithoutUserInput) {
        const goal = await this.findOne(userId, id); // Ensure ownership
        return this.prisma.savingsGoal.update({
            where: { id: goal.id },
            data,
        });
    }

    async remove(userId: string, id: string) {
        const goal = await this.findOne(userId, id); // Ensure ownership
        return this.prisma.savingsGoal.delete({
            where: { id: goal.id },
        });
    }
}
