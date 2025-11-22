


const BASE_URL = 'http://localhost:3000';

async function main() {
    console.log('Starting verification via API...');

    // 1. Signup a new user
    const email = `test-${Date.now()}@example.com`;
    const password = 'password123';
    const name = 'Test User';

    console.log(`Creating user: ${email}`);
    const signupRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, username: `user${Date.now()}` })
    });

    if (!signupRes.ok) {
        console.error('Signup failed:', await signupRes.text());
        return;
    }

    const { access_token } = await signupRes.json();
    console.log('User created, token received.');

    const headers = {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
    };

    // 2. Create Transaction
    // Total: 150. Creator (Implicit), User A (Pending), User B (Pending).

    // Create User A
    const emailA = `userA-${Date.now()}@example.com`;
    const signupResA = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailA, password, name: 'User A', username: `usera${Date.now()}` })
    });
    const { user: userA } = await signupResA.json();
    console.log(`User A created: ${userA.id}`);

    // Create User B (Pending)
    const emailB = `userB-${Date.now()}@example.com`;
    const signupResB = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailB, password, name: 'User B', username: `userb${Date.now()}` })
    });
    const { user: userB } = await signupResB.json();
    console.log(`User B created: ${userB.id}`);

    console.log('Creating transaction...');
    const transactionRes = await fetch(`${BASE_URL}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            amount: 150,
            description: 'Test Split',
            date: new Date().toISOString(),
            type: 'EXPENSE',
            categoryName: 'Test Category',
            isShared: true,
            participants: [
                {
                    userId: userA.id,
                    amount: 50,
                    percent: 33.33,
                    // Status will be PENDING
                },
                {
                    userId: userB.id,
                    amount: 50,
                    percent: 33.33,
                    // Status will be PENDING
                }
            ]
        })
    });

    if (!transactionRes.ok) {
        console.error('Transaction creation failed:', await transactionRes.text());
        return;
    }

    const transaction = await transactionRes.json();
    console.log(`Transaction created: ${transaction.id}`);

    // Login as User A to accept.
    const loginResA = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailA, password })
    });
    const { access_token: tokenA } = await loginResA.json();

    // User A accepts
    console.log('User A accepting...');

    const acceptRes = await fetch(`${BASE_URL}/transactions/${transaction.id}/respond`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${tokenA}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'ACCEPTED' })
    });

    if (!acceptRes.ok) {
        console.error('User A accept failed:', await acceptRes.text());
        return;
    }
    console.log('User A accepted.');

    // Now verify the split.
    // Fetch transaction as Creator.
    const getRes = await fetch(`${BASE_URL}/transactions/${transaction.id}`, {
        headers
    });
    const updatedTx = await getRes.json();

    console.log('Verifying shares...');
    updatedTx.participants.forEach((p: any) => {
        const name = p.user?.name || 'Creator';
        console.log(`${name} (${p.status}): Base=${p.baseShareAmount}, Share=${p.shareAmount}`);
    });
}

main().catch(console.error);
