import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class TransactionCategoryHelperService {
    constructor(
        private prisma: PrismaService,
        private categoriesService: CategoriesService
    ) { }

    async resolveCategory(userId: string, categoryId?: string, categoryName?: string, categoryColor?: string, language: string = 'pt'): Promise<string> {
        let finalCategoryId = categoryId;

        if (categoryName) {
            // Use CategoriesService to handle creation with translation and duplicate detection
            const category = await this.categoriesService.create(userId, categoryName, language);
            finalCategoryId = category.id;
        }

        if (!finalCategoryId) {
            throw new BadRequestException('Category is required (either id or name)');
        }

        if (categoryColor) {
            await this.categoriesService.updateColor(userId, finalCategoryId, categoryColor);
        }

        return finalCategoryId;
    }
}
