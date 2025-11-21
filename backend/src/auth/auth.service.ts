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
        const existingUser = await this.usersService.findByEmail(data.email);
        if (existingUser) {
            throw new UnauthorizedException('Email already exists');
        }
        const existingUsername = await this.usersService.findByUsername(data.username);
        if (existingUsername) {
            throw new UnauthorizedException('Username already exists');
        }

        const user = await this.usersService.create(data);
        return this.login(user);
    }
}
