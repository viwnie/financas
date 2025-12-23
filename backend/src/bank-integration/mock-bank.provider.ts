import { Injectable, Logger } from '@nestjs/common';
import { BankProvider, TransactionData } from './bank-provider.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MockBankProvider implements BankProvider {
    name = 'MOCK';
    private readonly logger = new Logger(MockBankProvider.name);

    async generateConnectUrl(userId: string): Promise<string> {
        this.logger.log(`Generating mock connect URL for user ${userId}`);
        return `http://localhost:3000/mock-bank-portal?userId=${userId}`;
    }

    async exchangeCode(code: string, userId: string): Promise<{ accessToken: string, itemId: string }> {
        this.logger.log(`Exchanging mock code ${code} for user ${userId}`);
        return {
            accessToken: `mock_access_token_${uuidv4()}`,
            itemId: `mock_item_${uuidv4()}`
        };
    }

    async fetchTransactions(accessToken: string, fromDate: Date): Promise<TransactionData[]> {
        this.logger.log(`Fetching mock transactions since ${fromDate.toISOString()}`);

        // Generate some random transactions
        return [
            {
                externalId: uuidv4(),
                amount: 25.00,
                date: new Date(),
                description: 'Mock Starbucks Coffee',
                currency: 'BRL',
                type: 'EXPENSE',
                category: 'Food'
            },
            {
                externalId: uuidv4(),
                amount: 1500.00,
                date: new Date(),
                description: 'Mock Salary Deposit',
                currency: 'BRL',
                type: 'INCOME',
                category: 'Income'
            },
            {
                externalId: uuidv4(),
                amount: 89.90,
                date: new Date(Date.now() - 86400000), // Yesterday
                description: 'Mock Spotify Subscription',
                currency: 'BRL',
                type: 'EXPENSE',
                category: 'Entertainment'
            }
        ];
    }

    async fetchBalances(accessToken: string): Promise<any> {
        return {
            checking: 5230.50,
            savings: 12000.00
        };
    }
}
