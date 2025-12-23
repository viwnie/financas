import { Module } from '@nestjs/common';
import { SavingsGoalsService } from './savings-goals.service';
import { SavingsGoalsController } from './savings-goals.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [SavingsGoalsController],
    providers: [SavingsGoalsService, PrismaService],
    exports: [SavingsGoalsService]
})
export class SavingsGoalsModule { }
