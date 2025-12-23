import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateBudgetDto {
    @IsString()
    categoryId: string;

    @IsNumber()
    amount: number;

    @IsOptional()
    @IsString()
    period?: string; // MONTHLY default

    @IsOptional()
    @IsNumber()
    softLimit?: number;
}
