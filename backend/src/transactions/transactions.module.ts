import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaService } from '../prisma.service';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [CategoriesModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, PrismaService],
})
export class TransactionsModule { }
