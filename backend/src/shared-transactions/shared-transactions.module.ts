import { Module } from '@nestjs/common';
import { SharedTransactionsService } from './shared-transactions.service';
import { SharedTransactionsController } from './shared-transactions.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SharedTransactionsController],
  providers: [SharedTransactionsService, PrismaService],
})
export class SharedTransactionsModule { }
