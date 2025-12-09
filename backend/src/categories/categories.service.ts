import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TranslationService } from '../common/translation.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
    constructor(
        private prisma: PrismaService,
        private translationService: TranslationService
    ) { }

    async create(userId: string, name: string, language: string = 'pt') {
        const normalizedName = name.trim().toLowerCase();

        // 1. Database Search (Direct)
        // Check if a translation exists with this name for system or user
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
            // Found a match via another language.
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
        // Logic: If the user is trying to create a category that doesn't exist publicly,
        // we create a PRIVATE category for them.
        // NOTE: The previous logic seemed to default to private (isSystem: false).
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
            // Provide a default 'name' for backward compatibility if possible, pick user's lang or first
            name: cat.translations[0]?.name || 'Unnamed',
            color: cat.userSettings[0]?.color || null
        }));
    }

    async updateColor(userId: string, categoryId: string, color: string) {
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

    async initSystemCategories() {
        const systemCategories = ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Salary', 'Investment'];
        for (const name of systemCategories) {
            let category = await this.prisma.category.findFirst({
                where: {
                    translations: { some: { name: { equals: name, mode: 'insensitive' } } },
                    isSystem: true
                }
            });

            if (!category) {
                // Initialize with English name.
                // In a real app we'd want translations for all system cats immediately, but simpler here.
                category = await this.prisma.category.create({
                    data: {
                        isSystem: true,
                        translations: {
                            create: { language: 'en', name }
                        }
                    }
                });
            }

            // Seed keywords
            const keywords = {
                'Food': ['mcdonalds', 'bk', 'burger', 'pizza', 'sushi', 'ifood', 'ubereats', 'restaurante', 'almoço', 'jantar', 'lanche'],
                'Transport': ['uber', '99', 'taxi', 'onibus', 'metro', 'combustivel', 'gasolina', 'estacionamento'],
                'Health': ['farmacia', 'drogaria', 'medico', 'dentista', 'hospital', 'exame', 'academia', 'smartfit'],
                'Entertainment': ['cinema', 'netflix', 'spotify', 'show', 'teatro', 'jogo', 'steam'],
                'Shopping': ['amazon', 'mercadolivre', 'shopee', 'roupa', 'tenis', 'eletronico'],
                'Housing': ['aluguel', 'condominio', 'iptu', 'reforma', 'moveis'],
                'Utilities': ['luz', 'agua', 'internet', 'celular', 'gas'],
                'Salary': ['salario', 'pagamento', 'renda'],
                'Investment': ['cdb', 'tesouro', 'acoes', 'fii', 'cripto']
            };

            if (keywords[name]) {
                for (const keyword of keywords[name]) {
                    const exists = await this.prisma.categoryKeyword.findFirst({ where: { categoryId: category.id, keyword } });
                    if (!exists) {
                        await this.prisma.categoryKeyword.create({
                            data: { categoryId: category.id, keyword, weight: 5 }
                        });
                    }
                }
            }
        }
    }

    private resolveCategoryName(category: any, language: string = 'en') {
        if (!category.translations || category.translations.length === 0) return 'Unnamed';

        const targetLang = language.toLowerCase();
        const baseLang = targetLang.split('-')[0];

        // 1. Exact match
        const exact = category.translations.find((t: any) => t.language.toLowerCase() === targetLang);
        if (exact) return exact.name;

        // 2. Base language match
        const base = category.translations.find((t: any) => t.language.toLowerCase() === baseLang);
        if (base) return base.name;

        // 3. English fallback
        const en = category.translations.find((t: any) => t.language === 'en');
        if (en) return en.name;

        // 4. First available
        return category.translations[0].name;
    }

    async predictCategory(userId: string, description: string, language: string = 'en') {
        if (!description) return null;
        const normalizedDesc = description.toLowerCase().trim();

        // 1. Personal Override (Adaptive Learning)
        const override = await this.prisma.personalCategoryOverride.findFirst({
            where: {
                userId,
                textPattern: { contains: normalizedDesc, mode: 'insensitive' }
            },
            orderBy: { weight: 'desc' },
            include: {
                category: {
                    include: {
                        userSettings: { where: { userId } },
                        translations: true
                    }
                }
            }
        });

        if (override) {
            const category = {
                ...override.category,
                name: this.resolveCategoryName(override.category, language),
                color: override.category.userSettings[0]?.color || null
            };
            return { category, confidence: 0.95, source: 'OVERRIDE' };
        }

        // 2. Personal History
        const history = await this.prisma.transaction.groupBy({
            by: ['categoryId'],
            where: {
                creatorId: userId,
                description: { contains: normalizedDesc, mode: 'insensitive' }
            },
            _count: { categoryId: true },
            orderBy: { _count: { categoryId: 'desc' } },
            take: 1
        });

        if (history.length > 0) {
            const categoryData = await this.prisma.category.findUnique({
                where: { id: history[0].categoryId },
                include: {
                    userSettings: { where: { userId } },
                    translations: true
                }
            });
            if (categoryData) {
                const category = {
                    ...categoryData,
                    name: this.resolveCategoryName(categoryData, language),
                    color: categoryData.userSettings[0]?.color || null
                };
                return { category, confidence: 0.8, source: 'HISTORY' };
            }
        }

        // 3. Semantic Match (Keywords)
        const words = normalizedDesc.split(/\s+/);
        const keywordMatches = await this.prisma.categoryKeyword.findMany({
            where: {
                keyword: { in: words, mode: 'insensitive' }
            },
            include: {
                category: {
                    include: {
                        userSettings: { where: { userId } },
                        translations: true
                    }
                }
            }
        });

        if (keywordMatches.length > 0) {
            const scores = new Map<string, { category: any, score: number }>();
            for (const match of keywordMatches) {
                const current = scores.get(match.categoryId) || { category: match.category, score: 0 };
                current.score += match.weight;
                scores.set(match.categoryId, current);
            }

            let topMatch: any = null;
            let maxScore = 0;
            for (const item of scores.values()) {
                if (item.score > maxScore) {
                    maxScore = item.score;
                    topMatch = item.category;
                }
            }

            if (topMatch) {
                const category = {
                    ...topMatch,
                    name: this.resolveCategoryName(topMatch, language),
                    color: topMatch.userSettings?.[0]?.color || null
                };
                return { category, confidence: 0.7, source: 'SEMANTIC' };
            }
        }

        // 4. Global Stats
        const globalStats = await this.prisma.globalCategoryStats.findMany({
            where: {
                keyword: { in: words, mode: 'insensitive' }
            },
            include: {
                category: {
                    include: {
                        userSettings: { where: { userId } },
                        translations: true
                    }
                }
            }
        });

        if (globalStats.length > 0) {
            const scores = new Map<string, { category: any, count: number }>();
            for (const stat of globalStats) {
                const current = scores.get(stat.categoryId) || { category: stat.category, count: 0 };
                current.count += stat.usageCount;
                scores.set(stat.categoryId, current);
            }

            let topMatch: any = null;
            let maxCount = 0;
            for (const item of scores.values()) {
                if (item.count > maxCount) {
                    maxCount = item.count;
                    topMatch = item.category;
                }
            }

            if (topMatch) {
                const category = {
                    ...topMatch,
                    name: this.resolveCategoryName(topMatch, language),
                    color: topMatch.userSettings?.[0]?.color || null
                };
                return { category, confidence: 0.6, source: 'GLOBAL' };
            }
        }

        return null;
    }

    async learnOverride(userId: string, description: string, categoryId: string) {
        if (!description) return;
        const normalizedDesc = description.toLowerCase().trim();

        // Check if override exists
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
                translations: {
                    some: {
                        name: { contains: query, mode: 'insensitive' }
                    }
                },
                OR: [{ userId }, { isSystem: true }]
            },
            include: {
                userSettings: {
                    where: { userId }
                },
                translations: true
            }
        });

        const categoriesWithColor = categories.map(cat => {
            // Find the matching translation
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

            // Name Match Score (Base)
            // 'cat.name' is now available because we mapped it above
            if (cat.name.toLowerCase().startsWith(query.toLowerCase())) score += 50;
            else score += 20;

            // Context Match (Prediction)
            // We can reuse parts of predict logic or simplified version
            // Check if this category matches the context via keywords
            const contextWords = context.toLowerCase().split(/\s+/);
            const keywordMatch = await this.prisma.categoryKeyword.findFirst({
                where: {
                    categoryId: cat.id,
                    keyword: { in: contextWords, mode: 'insensitive' }
                }
            });
            if (keywordMatch) score += 30;

            // Personal Usage Score
            const usage = await this.prisma.transaction.count({
                where: { creatorId: userId, categoryId: cat.id }
            });
            score += Math.min(usage, 20); // Cap usage score

            return { ...cat, score };
        }));

        return scored.sort((a, b) => b.score - a.score);
    }
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleGlobalStatsUpdate() {
        // 1. Aggregate all transactions
        const stats = await this.prisma.transaction.groupBy({
            by: ['categoryId', 'description'],
            _count: { _all: true },
            where: {
                description: { not: null }
            }
        });

        // 2. Process keywords
        const keywordMap = new Map<string, Map<string, number>>(); // keyword -> categoryId -> count

        for (const stat of stats) {
            if (!stat.description) continue;
            const words = stat.description.toLowerCase().split(/\s+/);
            const count = stat._count._all;

            for (const word of words) {
                if (word.length < 3) continue; // Skip short words

                if (!keywordMap.has(word)) {
                    keywordMap.set(word, new Map());
                }
                const catMap = keywordMap.get(word)!;
                catMap.set(stat.categoryId, (catMap.get(stat.categoryId) || 0) + count);
            }
        }

        // 3. Update GlobalCategoryStats
        for (const [keyword, catMap] of keywordMap.entries()) {
            // Find the dominant category for this keyword
            let dominantCat = '';
            let maxCount = 0;

            for (const [catId, count] of catMap.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantCat = catId;
                }
            }

            if (dominantCat && maxCount > 2) { // Threshold
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

        console.log('Global category stats updated');
    }
}
