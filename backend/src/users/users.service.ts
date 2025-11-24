import { Injectable } from '@nestjs/common';
import { Buffer } from 'buffer';
import { PrismaService } from '../prisma.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.UserCreateInput): Promise<User> {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
        });
    }

    async findOne(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async findByUsername(username: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { username },
        });
    }

    async findByUsernameInsensitive(username: string): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: {
                username: {
                    equals: username,
                    mode: 'insensitive',
                },
            },
        });
    }

    async search(query: string, currentUserId: string): Promise<Pick<User, 'name' | 'username'>[]> {
        return this.prisma.user.findMany({
            where: {
                username: {
                    contains: query,
                    mode: 'insensitive',
                },
                id: {
                    not: currentUserId,
                },
            },
            take: 10,
            select: {
                name: true,
                username: true
            }
        });
    }

    async update(id: string, data: any): Promise<User> {
        const updateData: Prisma.UserUpdateInput = { ...data };

        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        if (data.removeAvatar) {
            updateData.avatar = null;
            updateData.avatarMimeType = null;
            delete updateData['removeAvatar'];
        }

        // Check for uniqueness if username or email is being updated
        if (data.username) {
            const existingUser = await this.findByUsernameInsensitive(data.username);
            if (existingUser && existingUser.id !== id) {
                throw new Error('Username already exists');
            }
        }

        if (data.email) {
            const existingUser = await this.findByEmail(data.email);
            if (existingUser && existingUser.id !== id) {
                throw new Error('Email already exists');
            }
        }

        return this.prisma.user.update({
            where: { id },
            data: updateData,
        });
    }

    async checkUsernameAvailability(username: string): Promise<boolean> {
        const user = await this.findByUsernameInsensitive(username);
        return !user;
    }

    async getAvatar(id: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: { avatar: true, avatarMimeType: true },
        });

        if (!user || !user.avatar) {
            return null;
        }

        return {
            buffer: Buffer.from(user.avatar),
            mimeType: user.avatarMimeType || 'image/jpeg',
        };
    }
}
