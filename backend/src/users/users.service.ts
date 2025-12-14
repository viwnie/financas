import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { Buffer } from 'buffer';
import { PrismaService } from '../prisma.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.UserCreateInput): Promise<User> {
        this.logger.log(`Creating new user: ${data.username}`);
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Capitalize Name (Title Case) and handle whitespace
        const name = data.name
            .trim()
            .toLowerCase()
            .split(/\s+/) // Split by any whitespace and remove extra spaces
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        // Capitalize Username and trim
        const username = data.username.trim().charAt(0).toUpperCase() + data.username.trim().slice(1);

        // Capitalize Email First Letter and trim
        const formatEmail = (email: string) => email.trim().charAt(0).toUpperCase() + email.trim().slice(1);
        const formattedEmail = formatEmail(data.email);

        return this.prisma.user.create({
            data: {
                ...data,
                name,
                username,
                email: formattedEmail,
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
        return this.prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            },
        });
    }

    async findByUsername(username: string): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: {
                username: {
                    equals: username,
                    mode: 'insensitive'
                }
            },
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
                username: true,
                avatarMimeType: true
            }
        });
    }

    async update(id: string, data: any): Promise<User> {
        this.logger.log(`Updating user profile for ID: ${id}`);
        const updateData: Prisma.UserUpdateInput = { ...data };

        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            this.logger.warn(`User update failed: User not found for ID ${id}`);
            throw new BadRequestException('User not found');
        }

        if (data.currentPassword) {
            const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
            if (!isPasswordValid) {
                this.logger.warn(`User update failed: Invalid current password for user ${user.username}`);
                throw new UnauthorizedException('Invalid current password');
            }
        } else if (data.password || data.email !== user.email || data.username !== user.username) {
            // Require current password for sensitive changes
            // For now, let's enforce it for ANY update to be safe, or at least for password changes
            // The requirement was "ask for user password to update info OR change password"
            throw new UnauthorizedException('Current password is required to update profile');
        }

        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        if (data.removeAvatar) {
            updateData.avatar = null;
            updateData.avatarMimeType = null;
            delete updateData['removeAvatar'];
        }

        // Capitalize Name (Title Case)
        if (data.name) {
            updateData.name = data.name
                .trim()
                .toLowerCase()
                .split(/\s+/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }

        // Capitalize username first letter
        if (data.username) {
            const trimmed = data.username.trim();
            updateData.username = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        }

        // Check for uniqueness if username or email is being updated
        if (updateData.username) {
            const existingUser = await this.findByUsernameInsensitive(updateData.username as string);
            if (existingUser && existingUser.id !== id) {
                throw new BadRequestException('Username already exists');
            }
        }

        if (data.email) {
            const trimmedEmail = data.email.trim();
            // Capitalize Email First Letter
            data.email = trimmedEmail.charAt(0).toUpperCase() + trimmedEmail.slice(1);
            updateData.email = data.email;

            // Check email case-insensitively
            const existingUser = await this.prisma.user.findFirst({
                where: {
                    email: {
                        equals: data.email,
                        mode: 'insensitive'
                    }
                }
            });

            if (existingUser && existingUser.id !== id) {
                throw new BadRequestException('Email already exists');
            }
        }

        delete updateData['currentPassword'];
        delete updateData['removeAvatar'];

        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: updateData,
        });

        this.logger.log(`User updated successfully: ${updatedUser.username}`);
        return updatedUser;
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

    async getAvatarByUsername(username: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
        const user = await this.prisma.user.findUnique({
            where: { username },
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

    async getSavedColors(userId: string): Promise<string[]> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { savedColors: true }
        });
        return user?.savedColors || [];
    }

    async addSavedColor(userId: string, color: string): Promise<string[]> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { savedColors: true }
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        const currentColors = user.savedColors || [];
        // Avoid duplicates and limit if necessary (e.g. 50 colors)
        if (!currentColors.includes(color)) {
            // Limit to 20 saved colors for now to keep things sane
            const newColors = [...currentColors, color].slice(-20);

            await this.prisma.user.update({
                where: { id: userId },
                data: { savedColors: newColors }
            });
            return newColors;
        }

        return currentColors;
    }

    async deleteSavedColor(userId: string, colorToDelete: string): Promise<string[]> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { savedColors: true }
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        const currentColors = user.savedColors || [];
        const newColors = currentColors.filter(c => c !== colorToDelete && c !== decodeURIComponent(colorToDelete));

        if (newColors.length !== currentColors.length) {
            await this.prisma.user.update({
                where: { id: userId },
                data: { savedColors: newColors }
            });
            return newColors;
        }

        return currentColors;
    }

    async updateSavedColors(userId: string, newColors: string[]): Promise<string[]> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { savedColors: newColors }
        });
        return newColors;
    }
}
