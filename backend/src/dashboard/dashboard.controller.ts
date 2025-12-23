import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    getStats(@Request() req) {
        return this.dashboardService.getStats(req.user.userId);
    }

    @Get('evolution')
    getEvolution(@Request() req) {
        return this.dashboardService.getEvolution(req.user.userId);
    }

    @Get('comparison')
    getComparison(@Request() req) {
        return this.dashboardService.getComparison(req.user.userId);
    }
}
