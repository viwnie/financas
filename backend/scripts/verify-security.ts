import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function main() {
    console.log('Starting Security Verification...');

    // 1. Setup Users
    const userA = {
        name: 'Security User A',
        username: 'sec_user_a',
        email: 'sec_user_a@example.com',
        password: 'password123'
    };
    const userB = {
        name: 'Security User B',
        username: 'sec_user_b',
        email: 'sec_user_b@example.com',
        password: 'password123'
    };

    // Cleanup
    await prisma.friendRequestLog.deleteMany({
        where: {
            OR: [
                { requester: { username: { in: [userA.username, userB.username] } } },
                { addressee: { username: { in: [userA.username, userB.username] } } }
            ]
        }
    });
    await prisma.friendship.deleteMany({
        where: {
            OR: [
                { requester: { username: { in: [userA.username, userB.username] } } },
                { addressee: { username: { in: [userA.username, userB.username] } } }
            ]
        }
    });
    await prisma.user.deleteMany({
        where: { username: { in: [userA.username, userB.username] } }
    });

    // Create Users
    const hashedPassword = await hash(userA.password, 10);
    const dbUserA = await prisma.user.create({ data: { ...userA, password: hashedPassword } });
    const dbUserB = await prisma.user.create({ data: { ...userB, password: hashedPassword } });

    // Login User A
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userA.email, password: userA.password })
    });
    const loginData = await loginRes.json();
    const tokenA = loginData.access_token;

    // Login User B
    const loginResB = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userB.email, password: userB.password })
    });
    const loginDataB = await loginResB.json();
    const tokenB = loginDataB.access_token;

    // 2. Verify Search (UsersService)
    console.log('Verifying Search...');
    const searchRes = await fetch(`${BASE_URL}/users/search?q=${userB.username}`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const searchData = await searchRes.json();
    const foundUser = searchData[0];

    if (foundUser.id || foundUser.email || foundUser.password) {
        console.error('FAILED: Search leaked sensitive data:', foundUser);
        process.exit(1);
    }
    if (!foundUser.name || !foundUser.username) {
        console.error('FAILED: Search missing required data:', foundUser);
        process.exit(1);
    }
    console.log('PASSED: Search returned safe data.');

    // 3. Verify Friend Request Flow
    console.log('Verifying Friend Request...');
    await fetch(`${BASE_URL}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
        body: JSON.stringify({ username: userB.username })
    });

    // Check Pending Requests (User B)
    const pendingRes = await fetch(`${BASE_URL}/friends/pending`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const pendingData = await pendingRes.json();
    const request = pendingData[0];

    if (request.requester.id || request.requester.email) {
        console.error('FAILED: Pending request leaked requester data:', request.requester);
        process.exit(1);
    }
    console.log('PASSED: Pending requests returned safe data.');

    // Accept Request
    await fetch(`${BASE_URL}/friends/respond/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
        body: JSON.stringify({ status: 'ACCEPTED' })
    });

    // 4. Verify Friends List (User A)
    console.log('Verifying Friends List...');
    const friendsRes = await fetch(`${BASE_URL}/friends`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const friendsData = await friendsRes.json();
    const friend = friendsData[0];

    if (friend.id || friend.email) {
        console.error('FAILED: Friends list leaked friend data:', friend);
        process.exit(1);
    }
    console.log('PASSED: Friends list returned safe data.');

    // 5. Verify Remove Friend (using username)
    console.log('Verifying Remove Friend...');
    const removeRes = await fetch(`${BASE_URL}/friends/${userB.username}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });

    if (!removeRes.ok) {
        console.error('FAILED: Remove friend failed:', await removeRes.text());
        process.exit(1);
    }
    console.log('PASSED: Remove friend successful.');

    // 6. Verify Merge Request (using targetUsername)
    console.log('Verifying Merge Request...');

    // Create a dummy transaction for User A to have an external friend
    const tx = await prisma.transaction.create({
        data: {
            description: 'Test Tx',
            amount: 100,
            date: new Date(),
            type: 'EXPENSE',
            creator: { connect: { id: dbUserA.id } },
            participants: {
                create: {
                    placeholderName: 'ExternalUserB',
                    shareAmount: 50,
                    status: 'PENDING'
                }
            },
            category: {
                create: { name: 'Test Category', userId: dbUserA.id }
            }
        }
    });

    const mergeRes = await fetch(`${BASE_URL}/friends/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
        body: JSON.stringify({
            placeholderName: 'ExternalUserB',
            targetUsername: userB.username
        })
    });

    if (!mergeRes.ok) {
        console.error('FAILED: Create merge request failed:', await mergeRes.text());
        process.exit(1);
    }
    console.log('PASSED: Create merge request successful.');

    console.log('ALL SECURITY CHECKS PASSED!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
