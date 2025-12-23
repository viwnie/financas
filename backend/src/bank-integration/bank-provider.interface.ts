
export interface TransactionData {
    externalId: string;
    amount: number;
    date: Date;
    description: string;
    currency: string;
    category?: string;
    type: 'INCOME' | 'EXPENSE';
}

export interface BankProvider {
    name: string;

    /**
     * Generates a link/token for the user to authenticate with the bank.
     */
    generateConnectUrl(userId: string): Promise<string>;

    /**
     * Exchanges an authorization code for an access token.
     */
    exchangeCode(code: string, userId: string): Promise<{ accessToken: string, itemId: string }>;

    /**
     * Fetches transactions for a given connection.
     */
    fetchTransactions(accessToken: string, fromDate: Date): Promise<TransactionData[]>;

    /**
     * Fetches account balances (optional for now).
     */
    fetchBalances(accessToken: string): Promise<any>;
}
