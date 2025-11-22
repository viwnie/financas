


const BASE_URL = 'http://localhost:3000';

async function main() {
    console.log('Starting 500 error reproduction...');

    // 1. Login/Register to get token
    const email = `repro500-${Date.now()}@example.com`;
    const password = 'password123';
    const signupRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'Repro 500', username: `repro500${Date.now()}` })
    });

    let token;
    if (signupRes.ok) {
        const data = await signupRes.json();
        token = data.access_token;
    } else {
        // Try login if exists
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await loginRes.json();
        token = data.access_token;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. Create Transaction (Exact payload from user)
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

    console.log('Sending request...');
    const res = await fetch(`${BASE_URL}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        console.log('Success! Transaction created.');
        console.log(await res.json());
    } else {
        console.log(`Failed with status: ${res.status}`);
        console.log(await res.text());
    }
}

main().catch(console.error);
