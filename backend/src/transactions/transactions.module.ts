import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaService } from '../prisma.service';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionSharesService } from './transaction-shares.service';
import { TransactionExportService } from './transaction-export.service';
import { TransactionCategoryHelperService } from './transaction-category-helper.service';
import { TransactionInstallmentsService } from './transaction-installments.service';
import { TransactionParticipantsService } from './transaction-participants.service';

@Module({
  imports: [CategoriesModule],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    PrismaService,
    TransactionSharesService,
    TransactionExportService,
    TransactionCategoryHelperService,
    TransactionInstallmentsService,
    TransactionParticipantsService
  ],
  exports: [TransactionSharesService] // Export if needed by other modules
})
export class TransactionsModule { }
