import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { NudgesService } from './nudges.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('nudges')
@UseGuards(JwtAuthGuard)
export class NudgesController {
    constructor(private readonly nudgesService: NudgesService) { }

    @Get('active')
    async getActiveNudges(@Request() req) {
        return this.nudgesService.generateNudges(req.user.userId);
    }
}
