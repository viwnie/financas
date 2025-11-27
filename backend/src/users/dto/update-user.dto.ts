import { IsEmail, IsOptional, IsString, MinLength, Matches, IsBoolean, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-zA-Z\u00C0-\u00FF ]+$/, { message: 'Name must contain only letters and spaces' })
    name?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-zA-Z0-9]+$/, { message: 'Username must contain only letters and numbers' })
    username?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    currentPassword?: string;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    removeAvatar?: boolean;
}
