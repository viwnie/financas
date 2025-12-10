import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InstallmentStatus, Prisma } from '@prisma/client';

@Injectable()
export class TransactionInstallmentsService {
    constructor(private prisma: PrismaService) { }

    async createInstallments(transactionId: string, amount: number, installmentsCount: number | undefined, transactionDate: Date, tx?: Prisma.TransactionClient) {
        if (installmentsCount && installmentsCount > 1) {
            const installmentAmount = amount / installmentsCount;
            const installmentsData: Prisma.InstallmentCreateManyInput[] = [];

            for (let i = 0; i < installmentsCount; i++) {
                const dueDate = new Date(transactionDate);
                dueDate.setMonth(dueDate.getMonth() + i);

                installmentsData.push({
                    transactionId: transactionId,
                    number: i + 1,
                    amount: installmentAmount,
                    dueDate: dueDate,
                    status: InstallmentStatus.PENDING,
                });
            }

            const client = tx || this.prisma;
            await client.installment.createMany({
                data: installmentsData,
            });
        }
    }
}
