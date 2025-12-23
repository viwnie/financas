import { Controller, Post, Body, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { BankConnectionsService } from './bank-connections.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Assuming this exists

@Controller('bank-connections')
@UseGuards(JwtAuthGuard)
export class BankConnectionsController {
    constructor(private readonly bankConnectionsService: BankConnectionsService) { }

    @Get('providers')
    listProviders() {
        // Hardcoded or from service
        return ['MOCK'];
    }

    @Post('connect-url')
    async getConnectUrl(@Request() req, @Body('provider') provider: string) {
        const url = await this.bankConnectionsService.getConnectUrl(req.user.userId, provider);
        return { url };
    }

    @Post('exchange')
    async exchangeCode(
        @Request() req,
        @Body('provider') provider: string,
        @Body('code') code: string,
    ) {
        return this.bankConnectionsService.exchangeCode(req.user.userId, provider, code);
    }

    @Get()
    async getUserConnections(@Request() req) {
        return this.bankConnectionsService.listConnections(req.user.userId);
    }

    @Post(':id/sync')
    async syncConnection(@Request() req, @Param('id') id: string) {
        return this.bankConnectionsService.syncTransactions(req.user.userId, id);
    }
}
