import { Module } from '@nestjs/common';
import { BankConnectionsService } from './bank-connections.service';
import { BankConnectionsController } from './bank-connections.controller';
import { PrismaService } from '../prisma.service';
import { BankIntegrationModule } from '../bank-integration/bank-integration.module';

@Module({
    imports: [BankIntegrationModule],
    controllers: [BankConnectionsController],
    providers: [BankConnectionsService, PrismaService],
})
export class BankConnectionsModule { }
