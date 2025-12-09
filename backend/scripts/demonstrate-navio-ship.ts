
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- Translation Demonstration: "navio" (pt-BR) <-> "ship" (en) ---');

    console.log('\n1. Cleaning up previous test data...');
    const testNames = ['navio', 'ship'];
    const existingTranslations = await prisma.categoryTranslation.findMany({
        where: { name: { in: testNames, mode: 'insensitive' } },
        select: { categoryId: true }
    });

    const categoryIds = [...new Set(existingTranslations.map(t => t.categoryId))];
    if (categoryIds.length > 0) {
        await prisma.category.deleteMany({
            where: { id: { in: categoryIds } }
        });
        console.log(`   Deleted ${categoryIds.length} existing categories.`);
    } else {
        console.log('   No existing data found.');
    }

    console.log('\n2. Creating single Category with multiple translations...');
    const newCategory = await prisma.category.create({
        data: {
            isSystem: true, // Public category
            translations: {
                create: [
                    { language: 'pt-BR', name: 'navio' },
                    { language: 'en', name: 'ship' }
                ]
            }
        },
        include: {
            translations: true
        }
    });

    console.log('\n3. Result - Category Object from DB:');
    console.dir(newCategory, { depth: null, colors: true });

    console.log('\n4. Verifying queries...');

    // Search for "navio"
    const foundPt = await prisma.category.findFirst({
        where: {
            translations: { some: { name: 'navio', language: 'pt-BR' } }
        },
        include: { translations: true }
    });
    console.log(`   Query "navio" (pt-BR) found Category ID: ${foundPt?.id}`);
    console.log(`   Matches created ID? ${foundPt?.id === newCategory.id ? 'YES ✅' : 'NO ❌'}`);

    // Search for "ship"
    const foundEn = await prisma.category.findFirst({
        where: {
            translations: { some: { name: 'ship', language: 'en' } }
        },
        include: { translations: true }
    });
    console.log(`   Query "ship" (en) found Category ID:    ${foundEn?.id}`);
    console.log(`   Matches created ID? ${foundEn?.id === newCategory.id ? 'YES ✅' : 'NO ❌'}`);

    if (foundPt?.id === foundEn?.id) {
        console.log('\nSUCCESS: Both translations point to the same Category entity.');
    } else {
        console.log('\nFAILURE: Translations do not link to the same entity.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
