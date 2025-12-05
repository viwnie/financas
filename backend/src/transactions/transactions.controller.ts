import { Controller, Post, Body, Get, Param, Delete, UseGuards, Request, Res, Query, Patch } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionParticipantsService } from './transaction-participants.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType, ParticipantStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
    constructor(
        private readonly transactionsService: TransactionsService,
        private readonly transactionParticipantsService: TransactionParticipantsService
    ) { }

    @Post()
    create(@Request() req, @Body() createTransactionDto: CreateTransactionDto) {
        return this.transactionsService.create(req.user.userId, createTransactionDto);
    }

    @Get()
    findAll(
        @Request() req,
        @Query('month') month?: string,
        @Query('year') year?: string,
        @Query('type') type?: 'INCOME' | 'EXPENSE'
    ) {
        return this.transactionsService.findAll(req.user.userId, {
            month: month ? parseInt(month) : undefined,
            year: year ? parseInt(year) : undefined,
            type: type as any
        });
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.transactionsService.findOne(id, req.user.userId);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.transactionsService.remove(id, req.user.userId);
    }
    @Get('export')
    async export(@Request() req, @Res() res) {
        const csv = await this.transactionsService.exportToCsv(req.user.userId);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=transactions.csv');
        res.send(csv);
    }



    @Post(':id/respond')
    respond(@Param('id') id: string, @Request() req, @Body() body: { status: ParticipantStatus }) {
        return this.transactionParticipantsService.respondToInvitation(id, req.user.userId, body.status);
    }

    @Post(':id/leave')
    leave(@Param('id') id: string, @Request() req) {
        return this.transactionParticipantsService.leaveTransaction(id, req.user.userId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Request() req, @Body() updateTransactionDto: UpdateTransactionDto) {
        return this.transactionsService.update(id, req.user.userId, updateTransactionDto);
    }
}
