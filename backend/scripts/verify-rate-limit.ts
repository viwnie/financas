
import { PrismaClient } from '@prisma/client';

const BASE_URL = 'http://localhost:3000';
const prisma = new PrismaClient();

async function registerUser(name: string) {
    const email = `${name.toLowerCase()}-${Date.now()}@example.com`;
    const password = 'password123';
    const username = `${name.toLowerCase()}${Date.now()}`;

    const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, username })
    });

    if (!res.ok) {
        throw new Error(`Failed to register ${name}: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return { token: data.access_token, user: data.user };
}

async function sendRequest(token: string, usernameToAdd: string) {
    const res = await fetch(`${BASE_URL}/friends/request`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: usernameToAdd })
    });
    return res;
}

async function cancelRequest(token: string, requestId: string) {
    const res = await fetch(`${BASE_URL}/friends/request/${requestId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });
    return res;
}

async function main() {
    console.log('Starting Rate Limit Verification...');

    try {
        // 1. Register Users
        const userA = await registerUser('UserA');
        const userB = await registerUser('UserB');
        console.log(`Registered UserA (${userA.user.username}) and UserB (${userB.user.username})`);

        // 2. Send 7 requests
        for (let i = 1; i <= 7; i++) {
            console.log(`Sending request ${i}...`);
            const res = await sendRequest(userA.token, userB.user.username);

            if (!res.ok) {
                console.error(`Request ${i} failed: ${res.status} ${await res.text()}`);
                process.exit(1);
            }

            const data = await res.json();
            const requestId = data.id;
            console.log(`Request ${i} sent (ID: ${requestId})`);

            // Cancel it so we can send another one
            const cancelRes = await cancelRequest(userA.token, requestId);
            if (!cancelRes.ok) {
                console.error(`Failed to cancel request ${i}: ${cancelRes.status} ${await cancelRes.text()}`);
                process.exit(1);
            }
            console.log(`Request ${i} cancelled`);
        }

        // 3. Attempt 8th request (Should Fail)
        console.log('Sending request 8 (Should Fail)...');
        const res8 = await sendRequest(userA.token, userB.user.username);
        if (res8.ok) {
            console.error('Request 8 succeeded but should have failed!');
            process.exit(1);
        } else {
            const errorText = await res8.text();
            console.log(`Request 8 failed as expected: ${res8.status} ${errorText}`);
            if (!errorText.includes('limit of friend requests')) {
                console.error('Unexpected error message');
                process.exit(1);
            }
        }

        // 4. Directional Check: User B sends to User A (Should Succeed)
        console.log('User B sending request to User A (Should Succeed)...');
        const resB = await sendRequest(userB.token, userA.user.username);
        if (!resB.ok) {
            console.error(`User B request failed: ${resB.status} ${await resB.text()}`);
            process.exit(1);
        }
        console.log('User B request succeeded.');

        console.log('VERIFICATION SUCCESSFUL');

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
