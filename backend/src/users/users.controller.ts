import { Controller, Get, Post, Query, UseGuards, Request, Patch, Body, UseInterceptors, UploadedFile, BadRequestException, Res, Param } from '@nestjs/common';
import { Buffer } from 'buffer';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @UseGuards(JwtAuthGuard)
    @Get('search')
    async search(@Request() req, @Query('q') query: string) {
        if (!query || query.length < 2) {
            return [];
        }
        return this.usersService.search(query, req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('me')
    @UseInterceptors(FileInterceptor('avatar', {
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|heic|heif)$/)) {
                return cb(new BadRequestException('Only image files are allowed!'), false);
            }
            cb(null, true);
        },
    }))
    async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto, @UploadedFile() file: Express.Multer.File) {
        const data: any = { ...updateUserDto };
        if (file) {
            data['avatar'] = file.buffer;
            data['avatarMimeType'] = file.mimetype;
        }
        return this.usersService.update(req.user.userId, data);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me/colors')
    async getSavedColors(@Request() req) {
        return this.usersService.getSavedColors(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('me/colors')
    async addSavedColor(@Request() req, @Body('color') color: string) {
        if (!color) throw new BadRequestException('Color is required');
        return this.usersService.addSavedColor(req.user.userId, color);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('me/colors/:color')
    async deleteSavedColor(@Request() req, @Param('color') color: string) {
        // Using PATCH instead of DELETE because DELETE with body or complex param encoding can be tricky,
        // but RESTfully it should be DELETE. Let's try DELETE first, but if encoding issues arise, we might fallback.
        // Actually, let's stick to standard DELETE with Param.
        return this.usersService.deleteSavedColor(req.user.userId, color);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me/colors/delete/:color') // Fallback endpoint if DELETE method has issues with clients
    async deleteSavedColorFallback(@Request() req, @Param('color') color: string) {
        return this.usersService.deleteSavedColor(req.user.userId, color);
    }

    // Better implementation: DELETE with Param
    @UseGuards(JwtAuthGuard)
    @UseInterceptors()
    @Get('me/colors/remove') // Using GET/Query as a super safe fallback for special chars
    async removeColor(@Request() req, @Query('color') color: string) {
        return this.usersService.deleteSavedColor(req.user.userId, color);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('me/colors-list')
    async updateSavedColors(@Request() req, @Body('colors') colors: string[]) {
        return this.usersService.updateSavedColors(req.user.userId, colors);
    }

    @Get('check-username')
    async checkUsername(@Query('username') username: string) {
        const isAvailable = await this.usersService.checkUsernameAvailability(username);
        return { available: isAvailable };
    }

    @Get(':id/avatar')
    async getAvatar(@Param('id') id: string, @Res() res: Response) {
        const avatar = await this.usersService.getAvatar(id);
        if (!avatar) {
            return res.status(404).send('Avatar not found');
        }
        res.setHeader('Content-Type', avatar.mimeType);
        res.send(avatar.buffer);
    }

    @Get('avatar/:username')
    async getAvatarByUsername(@Param('username') username: string, @Res() res: Response) {
        const avatar = await this.usersService.getAvatarByUsername(username);
        if (!avatar) {
            return res.status(404).send('Avatar not found');
        }
        res.setHeader('Content-Type', avatar.mimeType);
        res.send(avatar.buffer);
    }
}
