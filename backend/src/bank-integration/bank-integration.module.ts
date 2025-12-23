import { Module } from '@nestjs/common';
import { BankIntegrationService } from './bank-integration.service';
import { MockBankProvider } from './mock-bank.provider';

@Module({
    providers: [BankIntegrationService, MockBankProvider],
    exports: [BankIntegrationService],
})
export class BankIntegrationModule { }
