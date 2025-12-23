import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { SavingsGoalsService } from './savings-goals.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('savings-goals')
@UseGuards(JwtAuthGuard)
export class SavingsGoalsController {
    constructor(private readonly savingsGoalsService: SavingsGoalsService) { }

    @Post()
    create(@Request() req, @Body() createSavingsGoalDto: Prisma.SavingsGoalCreateWithoutUserInput) {
        return this.savingsGoalsService.create(req.user.id, createSavingsGoalDto);
    }

    @Get()
    findAll(@Request() req) {
        return this.savingsGoalsService.findAll(req.user.id);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.savingsGoalsService.findOne(req.user.id, id);
    }

    @Patch(':id')
    update(@Request() req, @Param('id') id: string, @Body() updateSavingsGoalDto: Prisma.SavingsGoalUpdateWithoutUserInput) {
        return this.savingsGoalsService.update(req.user.id, id, updateSavingsGoalDto);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.savingsGoalsService.remove(req.user.id, id);
    }
}
