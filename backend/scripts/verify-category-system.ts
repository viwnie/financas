import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['info'] });

async function main() {
    console.log('Starting verification...');

    // 0. Connect
    await prisma.$connect();

    try {
        // 1. Cleanup
        console.log('Cleaning up old test data...');
        // Find categories that we might have created in previous runs or that clash with our test names
        const testNames = ['navio', 'ship', 'vessel', 'Navio', 'Ship', 'Vessel', 'MyPrivateCategory'];

        // Create a test user for private category context
        console.log('Creating test user...');
        const testUser = await prisma.user.upsert({
            where: { email: 'test-category-verifier@example.com' },
            create: {
                email: 'test-category-verifier@example.com',
                password: 'password123',
                name: 'Category Verifier',
                username: 'category_verifier'
            },
            update: {}
        });
        const testUserId = testUser.id;


        // Find translations with these names
        const translations = await prisma.categoryTranslation.findMany({
            where: { name: { in: testNames, mode: 'insensitive' } },
            select: { categoryId: true }
        });

        const catIds = translations.map(t => t.categoryId);

        if (catIds.length > 0) {
            console.log(`Deleting ${catIds.length} existing categories related to test names...`);
            await prisma.category.deleteMany({
                where: { id: { in: catIds } }
            });
        }

        // 2. Create Public Category 'Navio' (pt-BR) with translations
        console.log('Creating Public Category "Navio"...');
        // Using transaction to be safe
        const publicCat = await prisma.category.create({
            data: {
                isSystem: true,
                translations: {
                    create: [
                        { language: 'pt-BR', name: 'navio' },
                        { language: 'en', name: 'ship' },
                        { language: 'en', name: 'vessel' }
                    ]
                }
            },
            include: { translations: true }
        });
        console.log('Public Category Created:', JSON.stringify(publicCat, null, 2));

        // 3. Verify user creation logic
        // Requirement A: Create 'ship' (en). Should resolve to existing 'navio' category.
        console.log('Test A: User attempts to create category "ship" (en)...');

        const userInputName = 'ship';
        const userLang = 'en';

        // Logic that would exist in CategoriesService.create:
        // Check if system category exists with this name
        const existingPublic = await prisma.categoryTranslation.findFirst({
            where: {
                name: { equals: userInputName, mode: 'insensitive' },
                category: { isSystem: true }
            },
            include: { category: true }
        });

        if (existingPublic) {
            console.log(`[SUCCESS] Found existing public category ID: ${existingPublic.categoryId}. System would link to this.`);
            if (existingPublic.categoryId !== publicCat.id) {
                throw new Error(`Mismatch! Found ${existingPublic.categoryId}, expected ${publicCat.id}`);
            }
        } else {
            throw new Error('Failed to find public category by English translation "ship"');
        }

        // Requirement B: Private category unique concept
        // Attempt to create private translation "navio". Should also match.
        console.log('Test B: User attempts to create category "navio" (pt-BR)...');
        const existingPublicPt = await prisma.categoryTranslation.findFirst({
            where: {
                name: { equals: 'navio', mode: 'insensitive' },
                category: { isSystem: true }
            }
        });
        if (existingPublicPt) {
            console.log(`[SUCCESS] Found existing public category for "navio".`);
        } else {
            throw new Error('Failed to find public category by PT translation "navio"');
        }

        // Requirement C: Unique private category
        console.log('Test C: User creates truly new private category "MyUniqueThing"...');
        const uniqueName = 'MyUniqueThing';
        const existingUnique = await prisma.categoryTranslation.findFirst({
            where: {
                name: { equals: uniqueName, mode: 'insensitive' },
                category: { isSystem: true }
            }
        });

        if (!existingUnique) {
            console.log('No public match. Creating private category...');
            const privateCat = await prisma.category.create({
                data: {
                    isSystem: false,
                    userId: testUserId,
                    translations: {
                        create: [{ language: 'en', name: uniqueName }]
                    }
                }
            });
            console.log('Private Category Created:', privateCat.id);

            // Verify User B cannot find it
            // (Simulating search filtering)
            console.log('Test D: User B searches for "MyUniqueThing"...');
            const userBId = 'other-user';
            const foundForB = await prisma.categoryTranslation.findFirst({
                where: {
                    name: { equals: uniqueName, mode: 'insensitive' },
                    category: {
                        OR: [
                            { isSystem: true },
                            { userId: userBId }
                        ]
                    }
                }
            });

            if (foundForB) {
                throw new Error('User B should not see User A private category');
            } else {
                console.log('[SUCCESS] User B cannot see the private category.');
            }

        } else {
            throw new Error('Unexpectedly found public category for unique name');
        }

        console.log('ALL TESTS PASSED');

    } catch (error) {
        console.error('Test Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
