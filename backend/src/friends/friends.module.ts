import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { PrismaService } from '../prisma.service';
import { FriendRequestsService } from './friend-requests.service';
import { ExternalFriendsService } from './external-friends.service';

@Module({
  controllers: [FriendsController],
  providers: [FriendsService, PrismaService, FriendRequestsService, ExternalFriendsService],
})
export class FriendsModule { }
