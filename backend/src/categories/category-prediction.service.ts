
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CategoryHelper } from './category.helper';

@Injectable()
export class CategoryPredictionService {
    constructor(private prisma: PrismaService) { }

    async predictCategory(userId: string, description: string, language: string = 'en') {
        if (!description) return null;
        const normalizedDesc = description.toLowerCase().trim();

        // 1. Personal Override
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
                name: CategoryHelper.resolveCategoryName(override.category, language),
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
                    name: CategoryHelper.resolveCategoryName(categoryData, language),
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
                    name: CategoryHelper.resolveCategoryName(topMatch, language),
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
                    name: CategoryHelper.resolveCategoryName(topMatch, language),
                    color: topMatch.userSettings?.[0]?.color || null
                };
                return { category, confidence: 0.6, source: 'GLOBAL' };
            }
        }

        return null;
    }
}
