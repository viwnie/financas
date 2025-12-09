import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TransactionExportService {
    constructor(private prisma: PrismaService) { }

    async exportToCsv(userId: string) {
        const transactions = await this.prisma.transaction.findMany({
            where: {
                OR: [
                    { creatorId: userId },
                    { participants: { some: { userId } } }
                ]
            },
            include: {
                category: {
                    include: { translations: true }
                }
            },
            orderBy: { date: 'desc' },
        });

        const data = transactions.map((t) => ({
            Date: t.date.toISOString().split('T')[0],
            Description: t.description,
            Amount: t.amount,
            Type: t.type,
            Category: t.category.translations?.[0]?.name || 'Unnamed',
            Shared: t.isShared ? 'Yes' : 'No',
        }));

        const { Parser } = require('json2csv');
        const json2csvParser = new Parser();
        return json2csvParser.parse(data);
    }
}
