import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GamificationService implements OnModuleInit {
    private readonly logger = new Logger(GamificationService.name);

    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        await this.seedBadges();
    }

    private async seedBadges() {
        const badges = [
            {
                code: 'EARLY_BIRD',
                name: 'Early Bird',
                description: 'Logged in before 8 AM.',
                icon: 'Sunrise'
            },
            {
                code: 'STREAK_3',
                name: 'Heating Up',
                description: 'Reached a 3-day streak.',
                icon: 'Flame'
            },
            {
                code: 'BUDGET_MASTER',
                name: 'Budget Master',
                description: 'Created your first budget.',
                icon: 'Scale'
            },
            {
                code: 'FIRST_TRANSACTION',
                name: 'First Step',
                description: 'Created your first transaction.',
                icon: 'Footprints'
            }
        ];

        for (const badge of badges) {
            await this.prisma.badge.upsert({
                where: { code: badge.code },
                update: {},
                create: badge
            });
        }
        this.logger.log('Badges seeded initialized.');
    }

    async checkStreak(userId: string) {
        // 1. Get user
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Check if we already updated today
        if (user.lastStreakUpdate) {
            const lastUpdate = new Date(user.lastStreakUpdate);
            const lastUpdateDay = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());

            if (lastUpdateDay.getTime() === today.getTime()) {
                // Even if streak is up to date, let's verify badges
                await this.checkAndAwardBadges(userId);
                return { streak: user.streakCurrent, updated: false };
            }
        }

        // Check if yesterday
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let newStreak = 1;

        if (user.lastStreakUpdate) {
            const lastUpdate = new Date(user.lastStreakUpdate);
            const lastUpdateDay = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());

            if (lastUpdateDay.getTime() === yesterday.getTime()) {
                newStreak = user.streakCurrent + 1;
            } else {
                // Missed a day (or more), reset.
                newStreak = 1;
            }
        }

        // Use explicit update instead of 'updatedUser' return which might be partial in some mock contexts
        // In real Prisma, update returns the user.
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                streakCurrent: newStreak,
                streakLongest: Math.max(newStreak, user.streakLongest),
                lastStreakUpdate: now
            }
        });

        // Check badges after streak update
        await this.checkAndAwardBadges(userId);

        return { streak: updatedUser.streakCurrent, updated: true };
    }

    async getBadges(userId: string) {
        return this.prisma.userBadge.findMany({
            where: { userId },
            include: { badge: true }
        });
    }

    async listAllBadges() {
        return this.prisma.badge.findMany();
    }

    async checkAndAwardBadges(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                bankConnections: true,
                budgets: true,
                createdTransactions: { take: 1 } // Just check existence
            }
        });
        if (!user) return;

        const existingBadges = await this.prisma.userBadge.findMany({
            where: { userId },
            select: { badge: { select: { code: true } } }
        });
        const existingCodes = new Set(existingBadges.map(b => b.badge.code));

        const award = async (code: string) => {
            if (existingCodes.has(code)) return;

            const badge = await this.prisma.badge.findUnique({ where: { code } });
            if (badge) {
                await this.prisma.userBadge.create({
                    data: { userId, badgeId: badge.id }
                });
                this.logger.log(`Awarded badge ${code} to user ${userId}`);
            }
        };

        // Rule 1: Streak > 3
        if (user.streakCurrent >= 3) {
            await award('STREAK_3');
        }

        // Rule 2: Budget Created
        const budgetCount = await this.prisma.budget.count({ where: { userId } });
        if (budgetCount > 0) {
            await award('BUDGET_MASTER');
        }

        // Rule 3: First Transaction
        const txCount = await this.prisma.transaction.count({ where: { creatorId: userId } });
        if (txCount > 0) {
            await award('FIRST_TRANSACTION');
        }

        // Rule 4: Early Bird (Login < 8 AM) - This is checked "now"
        const hour = new Date().getHours();
        if (hour < 8 && hour >= 4) { // 4am to 8am
            await award('EARLY_BIRD');
        }
    }
}
