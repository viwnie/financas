import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TransactionType } from '@prisma/client';
import * as fs from 'fs';
// Fix import
const csv = require('csv-parser');

@Injectable()
export class ImportService {
    constructor(private prisma: PrismaService) { }

    async importCsv(userId: string, filePath: string) {
        const results: any[] = [];
        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data: any) => results.push(data))
                .on('end', async () => {
                    try {
                        await this.processCsvData(userId, results);
                        resolve({ count: results.length });
                    } catch (e) {
                        reject(e);
                    }
                })
                .on('error', (err) => reject(err));
        });
    }

    private async processCsvData(userId: string, data: any[]) {
        const defaultCategory = await this.prisma.category.findFirst({
            where: { OR: [{ userId }, { isSystem: true }] }
        });

        if (!defaultCategory) throw new BadRequestException('No default category found.');

        for (const row of data) {
            // Expected columns: Date, Description, Amount, Type (Income/Expense)
            // Simple mapping for now
            const amount = parseFloat(row.Amount);
            const type = row.Type?.toUpperCase() === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;

            if (isNaN(amount)) continue;

            await this.prisma.transaction.create({
                data: {
                    amount: Math.abs(amount), // Ensure positive or handle sign based on logic
                    date: new Date(row.Date),
                    description: row.Description || 'Imported Transaction',
                    type: type,
                    paymentMethod: 'CSV',
                    categoryId: defaultCategory.id,
                    creatorId: userId,
                    currency: 'BRL',
                    isShared: false,
                    isFixed: false
                }
            });
        }
    }
}
