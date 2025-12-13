import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TranslationService } from '../common/translation.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { CategoryPredictionService } from './category-prediction.service';
import { CategoryHelper } from './category.helper';

@Injectable()
export class CategoriesService {
    private readonly logger = new Logger(CategoriesService.name);

    constructor(
        private prisma: PrismaService,
        private translationService: TranslationService,
        private categoryPredictionService: CategoryPredictionService
    ) { }

    async create(userId: string, name: string, language: string = 'pt') {
        const normalizedName = name.trim().toLowerCase();

        // 1. Database Search (Direct)
        const existingTranslation = await this.prisma.categoryTranslation.findFirst({
            where: {
                name: { equals: normalizedName, mode: 'insensitive' as Prisma.QueryMode },
                category: {
                    OR: [
                        { isSystem: true },
                        { userId }
                    ]
                }
            },
            include: { category: true }
        });

        if (existingTranslation) return existingTranslation.category;

        // 2. Translate
        const languages = ['pt', 'en', 'es'];
        const translations: Record<string, string> = { [language]: normalizedName };

        for (const targetLang of languages) {
            if (targetLang !== language) {
                const translated = await this.translationService.translate(normalizedName, language, targetLang);
                translations[targetLang] = translated.toLowerCase().trim();
            }
        }

        // 3. Reverse Search (Deduplication via other languages)
        const conditions: Prisma.CategoryTranslationWhereInput[] = Object.entries(translations).map(([lang, val]) => ({
            language: lang,
            name: { equals: val, mode: 'insensitive' as Prisma.QueryMode },
            category: { OR: [{ isSystem: true }, { userId }] }
        }));

        const existingMatch = await this.prisma.categoryTranslation.findFirst({
            where: { OR: conditions },
            include: { category: true }
        });

        if (existingMatch) {
            const catId = existingMatch.categoryId;
            const hasLang = await this.prisma.categoryTranslation.findFirst({
                where: { categoryId: catId, language }
            });

            if (!hasLang) {
                await this.prisma.categoryTranslation.create({
                    data: {
                        categoryId: catId,
                        language,
                        name: normalizedName
                    }
                });
            }
            return existingMatch.category;
        }

        // 4. Create New Public/Private Category
        const createTranslations = Object.entries(translations).map(([lang, val]) => ({
            language: lang,
            name: val
        }));

        return this.prisma.category.create({
            data: {
                userId,
                isSystem: false,
                translations: {
                    create: createTranslations
                }
            },
        });
    }

    async findAll(userId: string) {
        const categories = await this.prisma.category.findMany({
            where: {
                OR: [
                    { isSystem: true },
                    { userId },
                ],
            },
            include: {
                userSettings: {
                    where: { userId }
                },
                translations: true
            }
        });

        return categories.map(cat => ({
            ...cat,
            name: CategoryHelper.resolveCategoryName(cat, 'pt'), // Default to PT for list if no user pref passed
            color: cat.userSettings[0]?.color || null
        }));
    }

    async updateColor(userId: string, categoryId: string, color: string) {
        this.logger.log(`Updating color for category ${categoryId} by user ${userId}`);
        return this.prisma.userCategorySetting.upsert({
            where: {
                userId_categoryId: { userId, categoryId }
            },
            create: {
                userId,
                categoryId,
                color
            },
            update: {
                color
            }
        });
    }

    async predictCategory(userId: string, description: string, language: string = 'en') {
        // this.logger.debug(`Predicting category for "${description}"`); // verbose
        return this.categoryPredictionService.predictCategory(userId, description, language);
    }

    async learnOverride(userId: string, description: string, categoryId: string) {
        if (!description) return;
        this.logger.log(`Learning category override: "${description}" -> ${categoryId}`);
        const normalizedDesc = description.toLowerCase().trim();

        const existing = await this.prisma.personalCategoryOverride.findFirst({
            where: {
                userId,
                textPattern: normalizedDesc,
                categoryId
            }
        });

        if (existing) {
            return this.prisma.personalCategoryOverride.update({
                where: { id: existing.id },
                data: { weight: { increment: 1 } }
            });
        } else {
            return this.prisma.personalCategoryOverride.create({
                data: {
                    userId,
                    textPattern: normalizedDesc,
                    categoryId,
                    weight: 1
                }
            });
        }
    }

    async searchCategories(userId: string, query: string, context?: string) {
        // 1. Basic Search
        const categories = await this.prisma.category.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { userId },
                            { isSystem: true }
                        ]
                    },
                    {
                        OR: [
                            {
                                translations: {
                                    some: {
                                        name: { contains: query, mode: 'insensitive' }
                                    }
                                }
                            },
                            {
                                keywords: {
                                    some: {
                                        keyword: { contains: query, mode: 'insensitive' }
                                    }
                                }
                            }
                        ]
                    }
                ]
            },
            include: {
                userSettings: {
                    where: { userId }
                },
                translations: true
            }
        });

        const categoriesWithColor = categories.map(cat => {
            const matchingTranslation = cat.translations.find(t => t.name.toLowerCase().includes(query.toLowerCase())) || cat.translations[0];
            return {
                ...cat,
                name: matchingTranslation?.name || 'Unnamed',
                color: cat.userSettings[0]?.color || null
            };
        });

        if (!context) return categoriesWithColor;

        // 2. Context Scoring
        const scored = await Promise.all(categoriesWithColor.map(async (cat: any) => {
            let score = 0;

            if (cat.name.toLowerCase().startsWith(query.toLowerCase())) score += 50;
            else score += 20;

            const contextWords = context.toLowerCase().split(/\s+/);
            const keywordMatch = await this.prisma.categoryKeyword.findFirst({
                where: {
                    categoryId: cat.id,
                    keyword: { in: contextWords, mode: 'insensitive' }
                }
            });
            if (keywordMatch) score += 30;

            const usage = await this.prisma.transaction.count({
                where: { creatorId: userId, categoryId: cat.id }
            });
            score += Math.min(usage, 20);

            return { ...cat, score };
        }));

        return scored.sort((a, b) => b.score - a.score);
    }

    async remove(userId: string, id: string) {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: { _count: { select: { transactions: true } } }
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        if (category.isSystem) {
            throw new ForbiddenException('Cannot delete system categories');
        }

        if (category.userId !== userId) {
            throw new ForbiddenException('You can only delete your own categories');
        }

        if (category._count.transactions > 0) {
            throw new BadRequestException('Cannot delete category with associated transactions');
        }

        return this.prisma.category.delete({
            where: { id }
        });
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleGlobalStatsUpdate() {
        this.logger.log('Updating Global Category Stats...');
        // 1. Aggregate all transactions
        const stats = await this.prisma.transaction.groupBy({
            by: ['categoryId', 'description'],
            _count: { _all: true },
            where: {
                description: { not: null }
            }
        });

        // 2. Process keywords
        const keywordMap = new Map<string, Map<string, number>>();

        for (const stat of stats) {
            if (!stat.description) continue;
            const words = stat.description.toLowerCase().split(/\s+/);
            const count = stat._count._all;

            for (const word of words) {
                if (word.length < 3) continue;

                if (!keywordMap.has(word)) {
                    keywordMap.set(word, new Map());
                }
                const catMap = keywordMap.get(word)!;
                catMap.set(stat.categoryId, (catMap.get(stat.categoryId) || 0) + count);
            }
        }

        // 3. Update GlobalCategoryStats
        for (const [keyword, catMap] of keywordMap.entries()) {
            let dominantCat = '';
            let maxCount = 0;

            for (const [catId, count] of catMap.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantCat = catId;
                }
            }

            if (dominantCat && maxCount > 2) {
                await this.prisma.globalCategoryStats.upsert({
                    where: { keyword },
                    create: {
                        keyword,
                        categoryId: dominantCat,
                        usageCount: maxCount
                    },
                    update: {
                        categoryId: dominantCat,
                        usageCount: maxCount
                    }
                });
            }
        }

        this.logger.log('Global category stats updated');
    }
}
