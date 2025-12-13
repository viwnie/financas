import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Request, Query, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Post()
    create(@Request() req, @Body('name') name: string, @Body('language') language?: string) {
        return this.categoriesService.create(req.user.userId, name, language);
    }

    @Get()
    findAll(@Request() req) {
        return this.categoriesService.findAll(req.user.userId);
    }

    @Get('predict')
    predict(@Request() req, @Query('description') description: string, @Query('language') language?: string) {
        return this.categoriesService.predictCategory(req.user.userId, description, language);
    }

    @Get('search')
    search(@Request() req, @Query('q') query: string, @Query('context') context?: string) {
        return this.categoriesService.searchCategories(req.user.userId, query, context);
    }

    @Post('learn')
    learn(@Request() req, @Body() body: { description: string, categoryId: string }) {
        return this.categoriesService.learnOverride(req.user.userId, body.description, body.categoryId);
    }

    @Patch(':id/color')
    updateColor(@Request() req, @Param('id') id: string, @Body('color') color: string) {
        return this.categoriesService.updateColor(req.user.userId, id, color);
    }

    @Delete(':id')
    delete(@Request() req, @Param('id') id: string) {
        return this.categoriesService.remove(req.user.userId, id);
    }
}
