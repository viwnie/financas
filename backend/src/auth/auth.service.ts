import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '@prisma/client';
import { TextHelper } from '../common/utils/text.helper';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        this.logger.warn(`Failed login attempt for email: ${email}`);
        return null;
    }

    async login(user: any) {
        this.logger.log(`User logged in: ${user.username} (${user.id})`);
        const payload = { username: user.username, sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                avatarMimeType: user.avatarMimeType,
            }
        };
    }

    async register(data: Prisma.UserCreateInput) {
        this.logger.log(`Registering new user: ${data.email} / ${data.username}`);
        const usernameRegex = /^[a-zA-Z0-9]+$/;
        if (!usernameRegex.test(data.username)) {
            throw new UnauthorizedException('Username must contain only letters and numbers');
        }

        const formattedUsername = TextHelper.capitalize(data.username);

        const existingUser = await this.usersService.findByEmail(data.email);
        if (existingUser) {
            this.logger.warn(`Registration failed: Email already exists - ${data.email}`);
            throw new UnauthorizedException('Email already exists');
        }

        const existingUsername = await this.usersService.findByUsernameInsensitive(formattedUsername);
        if (existingUsername) {
            this.logger.warn(`Registration failed: Username already exists - ${formattedUsername}`);
            throw new UnauthorizedException('Username already exists');
        }

        const user = await this.usersService.create({
            ...data,
            username: formattedUsername
        });
        return this.login(user);
    }

    // MFA Methods
    async generateMfaSecret(user: User) {
        const secret = authenticator.generateSecret();
        const otpauthUrl = authenticator.keyuri(user.email, 'MyFinanceApp', secret);

        await this.usersService.upsertSecurity(user.id, { mfaSecret: secret, mfaEnabled: false });

        return {
            secret,
            otpauthUrl
        };
    }

    async generateQrCode(otpauthUrl: string) {
        return QRCode.toDataURL(otpauthUrl);
    }

    async enableMfa(user: User, token: string) {
        const security = await this.usersService.getSecurity(user.id);
        if (!security || !security.mfaSecret) {
            throw new BadRequestException('MFA setup not initiated');
        }

        const isValid = authenticator.verify({ token, secret: security.mfaSecret });
        if (!isValid) {
            throw new UnauthorizedException('Invalid MFA token');
        }

        await this.usersService.upsertSecurity(user.id, { mfaEnabled: true });
        return { success: true };
    }

    async validateMfaToken(userId: string, token: string): Promise<boolean> {
        const security = await this.usersService.getSecurity(userId);
        if (!security || !security.mfaEnabled || !security.mfaSecret) {
            return false;
        }

        return authenticator.verify({ token, secret: security.mfaSecret });
    }
}
