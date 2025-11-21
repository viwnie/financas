import { Controller, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { SharedTransactionsService } from './shared-transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParticipantStatus } from '@prisma/client';

@Controller('shared-transactions')
@UseGuards(JwtAuthGuard)
export class SharedTransactionsController {
    constructor(private readonly sharedTransactionsService: SharedTransactionsService) { }

    @Get('pending')
    getPendingInvitations(@Request() req) {
        return this.sharedTransactionsService.getPendingInvitations(req.user.userId);
    }

    @Patch('respond/:id')
    respondToInvitation(@Request() req, @Param('id') id: string, @Body('status') status: ParticipantStatus) {
        return this.sharedTransactionsService.respondToInvitation(req.user.userId, id, status);
    }
}
