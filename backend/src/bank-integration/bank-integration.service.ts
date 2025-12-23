import { Injectable, BadRequestException } from '@nestjs/common';
import { BankProvider } from './bank-provider.interface';
import { MockBankProvider } from './mock-bank.provider';

@Injectable()
export class BankIntegrationService {
    private providers: Map<string, BankProvider> = new Map();

    constructor(private mockProvider: MockBankProvider) {
        this.registerProvider(mockProvider);
    }

    private registerProvider(provider: BankProvider) {
        this.providers.set(provider.name, provider);
    }

    getProvider(providerName: string): BankProvider {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new BadRequestException(`Provider ${providerName} not supported`);
        }
        return provider;
    }

    getAllProviders(): string[] {
        return Array.from(this.providers.keys());
    }
}
