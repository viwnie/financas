import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsBoolean, ValidateNested, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
    @IsEnum(TransactionType)
    type: TransactionType;

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsDateString()
    date: string;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsString()
    categoryName?: string;

    @IsOptional()
    @IsString()
    categoryColor?: string;

    @IsOptional()
    @IsString()
    language?: string;

    @IsOptional()
    @IsBoolean()
    isFixed?: boolean;

    @IsOptional()
    @IsBoolean()
    isShared?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(1)
    installmentsCount?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TransactionParticipantDto)
    participants?: TransactionParticipantDto[];
}

export class TransactionParticipantDto {
    @IsOptional()
    @IsString()
    id?: string;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsNumber()
    amount?: number;

    @IsOptional()
    @IsNumber()
    percent?: number;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    status?: string;
}
