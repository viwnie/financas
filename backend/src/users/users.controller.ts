import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('search')
    async search(@Request() req, @Query('q') query: string) {
        if (!query || query.length < 2) {
            return [];
        }
        return this.usersService.search(query, req.user.userId);
    }
}
