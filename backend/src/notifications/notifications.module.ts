import { Module, Global } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

@Global()
@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any },
        }),
    ],
    controllers: [NotificationsController],
    providers: [NotificationsGateway, NotificationsService, PrismaService],
    exports: [NotificationsGateway, NotificationsService],
})
export class NotificationsModule { }
