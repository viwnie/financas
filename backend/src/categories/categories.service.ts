import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, name: string) {
        return this.prisma.category.create({
            data: {
                name,
                userId,
                isSystem: false,
            },
        });
    }

    async findAll(userId: string) {
        return this.prisma.category.findMany({
            where: {
                OR: [
                    { isSystem: true },
                    { userId },
                ],
            },
        });
    }

    async initSystemCategories() {
        const systemCategories = ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Salary', 'Investment'];
        for (const name of systemCategories) {
            const exists = await this.prisma.category.findFirst({ where: { name, isSystem: true } });
            if (!exists) {
                await this.prisma.category.create({ data: { name, isSystem: true } });
            }
        }
    }
}
