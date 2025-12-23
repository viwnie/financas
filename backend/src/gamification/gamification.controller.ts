import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
    constructor(private readonly gamificationService: GamificationService) { }

    @Get('status')
    async getStatus(@Request() req) {
        // Trigger streak check on status load? Or separate 'ping'?
        // For MVP, let's assume visiting the dashboard updates the streak.
        const streakInfo = await this.gamificationService.checkStreak(req.user.userId);
        const badges = await this.gamificationService.getBadges(req.user.userId);

        return {
            streak: streakInfo?.streak || 0,
            badges
        };
    }

    @Get('badges')
    async getAllBadges() {
        return this.gamificationService.listAllBadges();
    }
}
