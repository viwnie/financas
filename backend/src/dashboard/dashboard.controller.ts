import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    async getCurrentStats(
        @Request() req,
        @Query('month') month?: number,
        @Query('year') year?: number
    ) {
        const date = new Date();
        const m = month ? Number(month) : date.getMonth() + 1;
        const y = year ? Number(year) : date.getFullYear();
        return this.dashboardService.getStats(req.user.userId, m, y);
    }

    @Get('evolution')
    async getEvolution(
        @Request() req,
        @Query('year') year?: number
    ) {
        const y = year ? Number(year) : new Date().getFullYear();
        return this.dashboardService.getEvolution(req.user.userId, y);
    }
}

