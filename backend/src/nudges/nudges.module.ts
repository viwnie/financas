import { Module } from '@nestjs/common';
import { NudgesService } from './nudges.service';
import { NudgesController } from './nudges.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [NudgesController],
    providers: [NudgesService, PrismaService],
})
export class NudgesModule { }
