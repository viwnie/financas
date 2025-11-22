import { Controller, Post, Body, Get, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FriendshipStatus } from '@prisma/client';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
    constructor(private readonly friendsService: FriendsService) { }

    @Post('request')
    sendRequest(@Request() req, @Body('username') username: string) {
        return this.friendsService.sendRequest(req.user.userId, username);
    }

    @Patch('respond/:id')
    respondToRequest(@Request() req, @Param('id') id: string, @Body('status') status: FriendshipStatus) {
        return this.friendsService.respondToRequest(req.user.userId, id, status);
    }

    @Get()
    getFriends(@Request() req) {
        return this.friendsService.getFriends(req.user.userId);
    }

    @Get('pending')
    getPendingRequests(@Request() req) {
        return this.friendsService.getPendingRequests(req.user.userId);
    }

    @Get('sent')
    getSentRequests(@Request() req) {
        return this.friendsService.getSentRequests(req.user.userId);
    }

    @Delete('request/:id')
    cancelRequest(@Request() req, @Param('id') id: string) {
        return this.friendsService.cancelRequest(req.user.userId, id);
    }

    @Delete(':username')
    removeFriend(@Request() req, @Param('username') username: string) {
        return this.friendsService.removeFriend(req.user.userId, username);
    }

    @Get('declined')
    getDeclinedRequests(@Request() req) {
        return this.friendsService.getDeclinedRequests(req.user.userId);
    }

    @Delete('declined/:id')
    deleteDeclinedRequest(@Request() req, @Param('id') id: string) {
        return this.friendsService.deleteDeclinedRequest(req.user.userId, id);
    }

    @Get('external')
    getExternalFriends(@Request() req) {
        return this.friendsService.getExternalFriends(req.user.userId);
    }

    @Post('merge')
    createMergeRequest(@Request() req, @Body() body: { placeholderName: string; targetUsername: string }) {
        return this.friendsService.createMergeRequest(req.user.userId, body.placeholderName, body.targetUsername);
    }

    @Get('merge/received')
    getReceivedMergeRequests(@Request() req) {
        return this.friendsService.getReceivedMergeRequests(req.user.userId);
    }

    @Get('merge/:id/details')
    getMergeRequestDetails(@Request() req, @Param('id') id: string) {
        return this.friendsService.getMergeRequestDetails(req.user.userId, id);
    }

    @Patch('merge/:id/respond')
    respondToMergeRequest(@Request() req, @Param('id') id: string, @Body('status') status: 'ACCEPTED' | 'REJECTED') {
        return this.friendsService.respondToMergeRequest(req.user.userId, id, status);
    }
}
