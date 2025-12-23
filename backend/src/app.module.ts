import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FriendsModule } from './friends/friends.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CategoriesModule } from './categories/categories.module';
import { SharedTransactionsModule } from './shared-transactions/shared-transactions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { SavingsGoalsModule } from './savings-goals/savings-goals.module';
import { PrismaService } from './prisma.service';
import { BankIntegrationModule } from './bank-integration/bank-integration.module';
import { BankConnectionsModule } from './bank-connections/bank-connections.module';
import { NudgesModule } from './nudges/nudges.module';
import { BudgetsModule } from './budgets/budgets.module';
import { ImportModule } from './import/import.module';
import { GamificationModule } from './gamification/gamification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    FriendsModule,
    TransactionsModule,
    CategoriesModule,
    SharedTransactionsModule,
    DashboardModule,
    NotificationsModule,
    SavingsGoalsModule,
    BankIntegrationModule,
    BankConnectionsModule,
    NudgesModule,
    BudgetsModule,
    ImportModule,
    GamificationModule
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
