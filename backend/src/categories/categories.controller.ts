import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Post()
    create(@Request() req, @Body('name') name: string) {
        return this.categoriesService.create(req.user.userId, name);
    }

    @Get()
    findAll(@Request() req) {
        return this.categoriesService.findAll(req.user.userId);
    }

    @Get('predict')
    predict(@Request() req, @Query('description') description: string) {
        return this.categoriesService.predictCategory(req.user.userId, description);
    }

    @Get('search')
    search(@Request() req, @Query('q') query: string, @Query('context') context?: string) {
        return this.categoriesService.searchCategories(req.user.userId, query, context);
    }

    @Post('learn')
    learn(@Request() req, @Body() body: { description: string, categoryId: string }) {
        return this.categoriesService.learnOverride(req.user.userId, body.description, body.categoryId);
    }
}
