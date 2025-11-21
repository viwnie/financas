import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
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
}
