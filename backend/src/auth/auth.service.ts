import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '@prisma/client';
import { TextHelper } from '../common/utils/text.helper';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import type { Profile } from 'passport-google-oauth20';

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

    async validateGoogleUser(profile: Profile) {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            throw new UnauthorizedException('Google account has no email');
        }

        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            return this.sanitizeUser(existingUser);
        }

        const nameCandidate =
            profile.displayName ||
            profile.name?.givenName ||
            email.split('@')[0];

        const baseUsername = TextHelper.sanitizeUsername(nameCandidate) || TextHelper.sanitizeUsername(email.split('@')[0]) || 'User';
        const username = await this.generateUniqueUsername(baseUsername);
        const password = this.generateRandomPassword();

        const user = await this.usersService.create({
            name: nameCandidate || 'Usuario',
            username,
            email,
            password,
        });

        return this.sanitizeUser(user);
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

    private sanitizeUser(user: User) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...rest } = user;
        return rest;
    }

    private generateRandomPassword() {
        return randomBytes(24).toString('hex');
    }

    private async generateUniqueUsername(base: string) {
        const sanitizedBase = TextHelper.sanitizeUsername(base) || 'User';
        let candidate = sanitizedBase;
        let attempt = 0;

        while (await this.usersService.findByUsernameInsensitive(candidate)) {
            attempt += 1;
            if (attempt < 1000) {
                candidate = `${sanitizedBase}${attempt}`;
                continue;
            }
            candidate = `${sanitizedBase}${randomBytes(2).toString('hex')}`;
        }

        return candidate;
    }
}
