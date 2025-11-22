
import { PrismaClient } from '@prisma/client';

// We need to use dynamic import for node-fetch or just use global fetch if available
// But since we are in ts-node, let's try to use the global fetch if Node 18+
// or use the one from previous scripts if it worked.
// Previous scripts used global fetch (after I removed the import).

const BASE_URL = 'http://localhost:3000';
const prisma = new PrismaClient();

async function main() {
    console.log('Starting 500 error reproduction (Deleted User)...');

    // 1. Register
    const email = `deleted-${Date.now()}@example.com`;
    const password = 'password123';
    const username = `deleted${Date.now()}`;

    console.log(`Registering user: ${username}`);
    const signupRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'Deleted User', username })
    });

    if (!signupRes.ok) {
        console.error('Registration failed');
        return;
    }

    const data = await signupRes.json();
    const token = data.access_token;
    const userId = data.user.id;

    console.log(`User registered: ${userId}`);

    // 2. Delete User from DB
    console.log('Deleting user from DB...');
    await prisma.user.delete({ where: { id: userId } });
    console.log('User deleted.');

    // 3. Create Transaction with Token
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const payload = {
        "type": "INCOME",
        "amount": 3000,
        "description": "Meu dinheiro",
        "date": "2025-11-30T03:00:00.000Z",
        "categoryName": "Salario",
        "isFixed": true,
        "installmentsCount": 1,
        "isShared": false,
        "participants": []
    };

    console.log('Sending create transaction request...');
    const res = await fetch(`${BASE_URL}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        console.log('Success! Transaction created (Unexpected).');
        console.log(await res.json());
    } else {
        console.log(`Failed with status: ${res.status}`);
        console.log(await res.text());
    }

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
});
