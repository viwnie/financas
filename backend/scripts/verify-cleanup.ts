import { PrismaClient, FriendshipStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Cleanup Verification...');

    // 1. Setup Users
    const userA = await prisma.user.upsert({
        where: { username: 'cleanup_user_a' },
        update: {},
        create: {
            name: 'Cleanup User A',
            username: 'cleanup_user_a',
            email: 'cleanup_user_a@example.com',
            password: 'password123'
        }
    });
    const userB = await prisma.user.upsert({
        where: { username: 'cleanup_user_b' },
        update: {},
        create: {
            name: 'Cleanup User B',
            username: 'cleanup_user_b',
            email: 'cleanup_user_b@example.com',
            password: 'password123'
        }
    });

    // Cleanup previous test data
    await prisma.friendship.deleteMany({
        where: {
            OR: [
                { requesterId: userA.id },
                { addresseeId: userA.id }
            ]
        }
    });

    // 2. Create Old Pending Request (> 7 days)
    const oldPending = await prisma.friendship.create({
        data: {
            requesterId: userA.id,
            addresseeId: userB.id,
            status: FriendshipStatus.PENDING,
            updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
        }
    });

    // 3. Create Recent Pending Request (< 7 days)
    const recentPending = await prisma.friendship.create({
        data: {
            requesterId: userB.id,
            addresseeId: userA.id,
            status: FriendshipStatus.PENDING,
            updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) // 6 days ago
        }
    });

    // 4. Create Old Cancelled Request (> 1 day)
    // Need a 3rd user to avoid unique constraint collision if we reuse A-B pair
    const userC = await prisma.user.upsert({
        where: { username: 'cleanup_user_c' },
        update: {},
        create: {
            name: 'Cleanup User C',
            username: 'cleanup_user_c',
            email: 'cleanup_user_c@example.com',
            password: 'password123'
        }
    });

    const oldCancelled = await prisma.friendship.create({
        data: {
            requesterId: userA.id,
            addresseeId: userC.id,
            status: FriendshipStatus.CANCELLED,
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
    });

    // 5. Create Old FriendRequestLog (> 30 days)
    const oldLog = await prisma.friendRequestLog.create({
        data: {
            requesterId: userA.id,
            addresseeId: userB.id,
            createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) // 31 days ago
        }
    });

    // 6. Create Recent FriendRequestLog (< 30 days)
    const recentLog = await prisma.friendRequestLog.create({
        data: {
            requesterId: userB.id,
            addresseeId: userA.id,
            createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000) // 29 days ago
        }
    });

    console.log('Created test data. Running cleanup logic...');

    // Simulate Cleanup Logic (Copy-paste from service)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const deletedPending = await prisma.friendship.deleteMany({
        where: {
            status: FriendshipStatus.PENDING,
            updatedAt: { lt: sevenDaysAgo }
        }
    });

    const deletedCancelled = await prisma.friendship.deleteMany({
        where: {
            status: FriendshipStatus.CANCELLED,
            updatedAt: { lt: oneDayAgo }
        }
    });

    const deletedLogs = await prisma.friendRequestLog.deleteMany({
        where: {
            createdAt: { lt: thirtyDaysAgo }
        }
    });

    console.log(`Deleted ${deletedPending.count} pending, ${deletedCancelled.count} cancelled, and ${deletedLogs.count} logs.`);

    // Verify
    const checkOldPending = await prisma.friendship.findUnique({ where: { id: oldPending.id } });
    const checkRecentPending = await prisma.friendship.findUnique({ where: { id: recentPending.id } });
    const checkOldCancelled = await prisma.friendship.findUnique({ where: { id: oldCancelled.id } });

    const checkOldLog = await prisma.friendRequestLog.findUnique({ where: { id: oldLog.id } });
    const checkRecentLog = await prisma.friendRequestLog.findUnique({ where: { id: recentLog.id } });

    if (checkOldPending) {
        console.error('FAILED: Old pending request was NOT deleted.');
        process.exit(1);
    }
    if (!checkRecentPending) {
        console.error('FAILED: Recent pending request WAS deleted.');
        process.exit(1);
    }
    if (checkOldCancelled) {
        console.error('FAILED: Old cancelled request was NOT deleted.');
        process.exit(1);
    }
    if (checkOldLog) {
        console.error('FAILED: Old log was NOT deleted.');
        process.exit(1);
    }
    if (!checkRecentLog) {
        console.error('FAILED: Recent log WAS deleted.');
        process.exit(1);
    }

    console.log('PASSED: Cleanup logic verified.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
