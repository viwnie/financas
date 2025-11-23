import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, name: string) {
        return this.prisma.category.create({
            data: {
                name,
                userId,
                isSystem: false,
            },
        });
    }

    async findAll(userId: string) {
        return this.prisma.category.findMany({
            where: {
                OR: [
                    { isSystem: true },
                    { userId },
                ],
            },
        });
    }

    async initSystemCategories() {
        const systemCategories = ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Salary', 'Investment'];
        for (const name of systemCategories) {
            let category = await this.prisma.category.findFirst({ where: { name, isSystem: true } });
            if (!category) {
                category = await this.prisma.category.create({ data: { name, isSystem: true } });
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

    async predictCategory(userId: string, description: string) {
        if (!description) return null;
        const normalizedDesc = description.toLowerCase().trim();

        // 1. Personal Override (Adaptive Learning)
        // Check for exact or close pattern match
        const override = await this.prisma.personalCategoryOverride.findFirst({
            where: {
                userId,
                textPattern: { contains: normalizedDesc, mode: 'insensitive' }
            },
            orderBy: { weight: 'desc' },
            include: { category: true }
        });

        if (override) {
            return { category: override.category, confidence: 0.95, source: 'OVERRIDE' };
        }

        // 2. Personal History
        // Find recent transactions with similar description
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
            const category = await this.prisma.category.findUnique({ where: { id: history[0].categoryId } });
            if (category) return { category, confidence: 0.8, source: 'HISTORY' };
        }

        // 3. Semantic Match (Keywords)
        const words = normalizedDesc.split(/\s+/);
        const keywordMatches = await this.prisma.categoryKeyword.findMany({
            where: {
                keyword: { in: words, mode: 'insensitive' }
            },
            include: { category: true }
        });

        if (keywordMatches.length > 0) {
            // Aggregate weights by category
            const scores = new Map<string, { category: any, score: number }>();
            for (const match of keywordMatches) {
                const current = scores.get(match.categoryId) || { category: match.category, score: 0 };
                current.score += match.weight;
                scores.set(match.categoryId, current);
            }

            // Find top score
            let topMatch = null;
            let maxScore = 0;
            for (const item of scores.values()) {
                if (item.score > maxScore) {
                    maxScore = item.score;
                    topMatch = item.category;
                }
            }

            if (topMatch) return { category: topMatch, confidence: 0.7, source: 'SEMANTIC' };
        }

        // 4. Global Stats (Pre-computed)
        const globalStats = await this.prisma.globalCategoryStats.findMany({
            where: {
                keyword: { in: words, mode: 'insensitive' }
            },
            include: { category: true }
        });

        if (globalStats.length > 0) {
            // Aggregate usage counts
            const scores = new Map<string, { category: any, count: number }>();
            for (const stat of globalStats) {
                const current = scores.get(stat.categoryId) || { category: stat.category, count: 0 };
                current.count += stat.usageCount;
                scores.set(stat.categoryId, current);
            }

            let topMatch = null;
            let maxCount = 0;
            for (const item of scores.values()) {
                if (item.count > maxCount) {
                    maxCount = item.count;
                    topMatch = item.category;
                }
            }

            if (topMatch) return { category: topMatch, confidence: 0.6, source: 'GLOBAL' };
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
                name: { contains: query, mode: 'insensitive' },
                OR: [{ userId }, { isSystem: true }]
            }
        });

        if (!context) return categories;

        // 2. Context Scoring
        const scored = await Promise.all(categories.map(async (cat) => {
            let score = 0;

            // Name Match Score (Base)
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
