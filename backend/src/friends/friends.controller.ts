import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendRequestsService } from './friend-requests.service';
import { ExternalFriendsService } from './external-friends.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
    constructor(
        private friendsService: FriendsService,
        private friendRequestsService: FriendRequestsService,
        private externalFriendsService: ExternalFriendsService
    ) { }

    @Get()
    getFriends(@Request() req) {
        return this.friendsService.getFriends(req.user.userId);
    }

    @Delete(':id')
    removeFriend(@Request() req, @Param('id') id: string) {
        return this.friendsService.removeFriend(req.user.userId, id);
    }

    // Requests
    @Post('request')
    sendRequest(@Request() req, @Body('username') username: string) {
        return this.friendRequestsService.sendRequest(req.user.userId, username);
    }

    @Get('requests/pending')
    getPendingRequests(@Request() req) {
        return this.friendRequestsService.getPendingRequests(req.user.userId);
    }

    @Get('requests/sent')
    getSentRequests(@Request() req) {
        return this.friendRequestsService.getSentRequests(req.user.userId);
    }

    @Get('requests/declined')
    getDeclinedRequests(@Request() req) {
        return this.friendRequestsService.getDeclinedRequests(req.user.userId);
    }

    @Patch('request/:id')
    respondToRequest(@Request() req, @Param('id') id: string, @Body('status') status: 'ACCEPTED' | 'DECLINED') {
        return this.friendRequestsService.respondToRequest(req.user.userId, id, status);
    }

    @Delete('request/:id')
    cancelRequest(@Request() req, @Param('id') id: string) {
        return this.friendRequestsService.cancelRequest(req.user.userId, id);
    }

    // External Friends
    @Post('external')
    addExternalFriend(@Request() req, @Body() data: { name: string, email?: string }) {
        return this.externalFriendsService.addExternalFriend(req.user.userId, data.name);
    }

    @Get('external')
    getExternalFriends(@Request() req) {
        return this.externalFriendsService.getExternalFriends(req.user.userId);
    }

    @Delete('external/:id')
    deleteExternalFriend(@Request() req, @Param('id') id: string) {
        return this.externalFriendsService.deleteExternalFriend(req.user.userId, id);
    }

    @Post('external/merge')
    createMergeRequest(@Request() req, @Body() data: { externalFriendId: string, internalUserEmail: string }) {
        return this.externalFriendsService.createMergeRequest(req.user.userId, data.externalFriendId, data.internalUserEmail);
    }

    @Get('merge-requests')
    getMergeRequests(@Request() req) {
        return this.externalFriendsService.getReceivedMergeRequests(req.user.userId);
    }

    @Patch('merge-request/:id')
    respondToMergeRequest(@Request() req, @Param('id') id: string, @Body('status') status: 'ACCEPTED' | 'REJECTED') {
        return this.externalFriendsService.respondToMergeRequest(req.user.userId, id, status);
    }
}
