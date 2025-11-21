import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    findAll(@Request() req) {
        return this.notificationsService.findAll(req.user.userId);
    }

    @Post(':id/read')
    markAsRead(@Request() req, @Param('id') id: string) {
        return this.notificationsService.markAsRead(req.user.userId, id);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.notificationsService.delete(req.user.userId, id);
    }
}
