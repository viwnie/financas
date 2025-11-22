import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
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
        return null;
    }

    async login(user: any) {
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
        // 1. Validate Username Format (Alphanumeric only)
        const usernameRegex = /^[a-zA-Z0-9]+$/;
        if (!usernameRegex.test(data.username)) {
            throw new UnauthorizedException('Username must contain only letters and numbers');
        }

        // 2. Format Username (Capitalize first letter)
        const formattedUsername = data.username.charAt(0).toUpperCase() + data.username.slice(1);

        const existingUser = await this.usersService.findByEmail(data.email);
        if (existingUser) {
            throw new UnauthorizedException('Email already exists');
        }

        // 3. Check Uniqueness (Case-insensitive)
        const existingUsername = await this.usersService.findByUsernameInsensitive(formattedUsername);
        if (existingUsername) {
            throw new UnauthorizedException('Username already exists');
        }

        const user = await this.usersService.create({
            ...data,
            username: formattedUsername
        });
        return this.login(user);
    }
}
