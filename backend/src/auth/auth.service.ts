import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { TextHelper } from '../common/utils/text.helper';

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
}
