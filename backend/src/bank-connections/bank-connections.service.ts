import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BankIntegrationService } from '../bank-integration/bank-integration.service';
import { BankConnection, TransactionType } from '@prisma/client';

@Injectable()
export class BankConnectionsService {
    private readonly logger = new Logger(BankConnectionsService.name);

    constructor(
        private prisma: PrismaService,
        private bankIntegration: BankIntegrationService,
    ) { }

    async getConnectUrl(userId: string, providerName: string) {
        const provider = this.bankIntegration.getProvider(providerName);
        return provider.generateConnectUrl(userId);
    }

    async exchangeCode(userId: string, providerName: string, code: string) {
        const provider = this.bankIntegration.getProvider(providerName);
        const { accessToken, itemId } = await provider.exchangeCode(code, userId);

        // Save connection
        const connection = await this.prisma.bankConnection.upsert({
            where: {
                userId_provider_itemId: {
                    userId,
                    provider: providerName,
                    itemId,
                },
            },
            update: {
                accessToken,
                status: 'ACTIVE',
                updatedAt: new Date(),
            },
            create: {
                userId,
                provider: providerName,
                itemId,
                accessToken,
                status: 'ACTIVE',
            },
        });

        return connection;
    }

    async listConnections(userId: string) {
        return this.prisma.bankConnection.findMany({
            where: { userId },
        });
    }

    async syncTransactions(userId: string, connectionId: string) {
        const connection = await this.prisma.bankConnection.findFirst({
            where: { id: connectionId, userId },
        });

        if (!connection) {
            throw new NotFoundException('Connection not found');
        }

        const provider = this.bankIntegration.getProvider(connection.provider);
        if (!connection.accessToken) {
            throw new BadRequestException('Connection has no access token');
        }

        // Fetch last 30 days or since last sync
        const lastSync = connection.lastSyncedAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const transactions = await provider.fetchTransactions(connection.accessToken, lastSync);

        this.logger.log(`Fetched ${transactions.length} transactions from ${connection.provider}`);

        let count = 0;
        // Basic import logic (deduplication needed in real production via externalId)
        // For now, simple insert

        // We need a default category. Let's find one or create one.
        // Ideally we should have a 'Uncategorized' system category.
        // For now, let's just pick the first one for the user or system one.
        const defaultCategory = await this.prisma.category.findFirst({
            where: { OR: [{ userId: userId }, { isSystem: true }] }
        });

        if (!defaultCategory) {
            this.logger.warn('No category found for user, skipping import');
            return { count: 0 };
        }

        for (const tx of transactions) {
            // TODO: improvements on deduplication using externalId if stored in metadata or separate table
            await this.prisma.transaction.create({
                data: {
                    amount: tx.amount,
                    date: new Date(tx.date),
                    description: tx.description,
                    type: tx.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE,
                    categoryId: defaultCategory.id,
                    creatorId: userId,
                    paymentMethod: 'OpenFinance', // Or whatever
                    isShared: false,
                    isFixed: false,
                    currency: tx.currency
                }
            });
            count++;
        }

        await this.prisma.bankConnection.update({
            where: { id: connectionId },
            data: { lastSyncedAt: new Date() }
        });

        return { synced: count };
    }
}
