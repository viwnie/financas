import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './create-budget.dto';
import { UpdateBudgetDto } from './update-budget.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
    constructor(private readonly budgetsService: BudgetsService) { }

    @Post()
    create(@Request() req, @Body() createBudgetDto: CreateBudgetDto) {
        return this.budgetsService.create(req.user.userId, createBudgetDto);
    }

    @Get()
    findAll(@Request() req) {
        return this.budgetsService.findAll(req.user.userId);
    }

    @Get('status')
    getStatus(@Request() req) {
        return this.budgetsService.getBudgetStatus(req.user.userId);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.budgetsService.findOne(id, req.user.userId);
    }

    @Patch(':id')
    update(@Request() req, @Param('id') id: string, @Body() updateBudgetDto: UpdateBudgetDto) {
        return this.budgetsService.update(id, req.user.userId, updateBudgetDto);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.budgetsService.remove(id, req.user.userId);
    }
}
