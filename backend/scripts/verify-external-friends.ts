
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting External Friends Verification...');

    // 1. Setup Users
    const userA = await prisma.user.upsert({
        where: { email: 'ext_user_a@test.com' },
        update: {},
        create: {
            email: 'ext_user_a@test.com',
            username: 'ext_user_a',
            name: 'External User A',
            password: 'password123'
        }
    });

    // 2. Add External Friend
    console.log('Adding external friend...');
    const extName = 'Test External Friend';

    // Clean up if exists
    await prisma.externalFriend.deleteMany({
        where: { userId: userA.id, name: extName }
    });

    const added = await prisma.externalFriend.create({
        data: { userId: userA.id, name: extName }
    });
    console.log('Added external friend:', added);

    // 3. Fetch External Friends
    console.log('Fetching external friends...');
    // Simulate service logic
    const stored = await prisma.externalFriend.findMany({
        where: { userId: userA.id },
        select: { id: true, name: true }
    });

    const found = stored.find(f => f.name === extName);
    if (!found) {
        console.error('FAILED: External friend not found in fetch.');
        process.exit(1);
    }
    if (!found.id) {
        console.error('FAILED: External friend has no ID.');
        process.exit(1);
    }
    console.log('Found external friend:', found);

    // 4. Delete External Friend
    console.log('Deleting external friend...');
    await prisma.externalFriend.delete({
        where: { id: found.id }
    });

    // 5. Verify Deletion
    const check = await prisma.externalFriend.findUnique({
        where: { id: found.id }
    });

    if (check) {
        console.error('FAILED: External friend was NOT deleted.');
        process.exit(1);
    }

    console.log('PASSED: External friend lifecycle verified.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
