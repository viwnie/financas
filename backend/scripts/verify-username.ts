


const BASE_URL = 'http://localhost:3000';

async function main() {
    console.log('Starting username verification...');

    const timestamp = Date.now();
    const password = 'password123';

    // 1. Valid Registration (Should Capitalize)
    // Input: "testuser" -> Expected: "Testuser"
    const username1 = `testuser${timestamp}`;
    const email1 = `test1-${timestamp}@example.com`;

    console.log(`\n1. Testing Valid Registration: "${username1}"`);
    const res1 = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email1, password, name: 'Test User', username: username1 })
    });

    if (res1.ok) {
        const data1 = await res1.json();
        console.log(`   Success! Registered: ${data1.user.username}`);
        if (data1.user.username === username1.charAt(0).toUpperCase() + username1.slice(1)) {
            console.log('   [PASS] Username was capitalized correctly.');
        } else {
            console.log(`   [FAIL] Username was NOT capitalized correctly. Got: ${data1.user.username}`);
        }
    } else {
        console.log(`   [FAIL] Registration failed: ${res1.status}`);
    }

    // 2. Duplicate Registration (Case-Insensitive)
    // Input: "TestUser" (same chars, different case) -> Expected: Fail
    const username2 = `TestUser${timestamp}`; // Same letters as username1, but CamelCase
    // Actually, username1 was "testuser..." (lowercase). 
    // Let's try to register "TESTUSER..." (uppercase)
    const username2Upper = username1.toUpperCase();
    const email2 = `test2-${timestamp}@example.com`;

    console.log(`\n2. Testing Duplicate Registration (Case-Insensitive): "${username2Upper}"`);
    const res2 = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email2, password, name: 'Test User 2', username: username2Upper })
    });

    if (res2.status === 401) { // UnauthorizedException
        const err = await res2.json();
        if (err.message === 'Username already exists') {
            console.log('   [PASS] Duplicate registration rejected correctly.');
        } else {
            console.log(`   [FAIL] Rejected but wrong message: ${err.message}`);
        }
    } else {
        console.log(`   [FAIL] Registration should have failed but got: ${res2.status}`);
    }

    // 3. Invalid Format
    // Input: "user_name" or "user!" -> Expected: Fail
    const username3 = `user_name${timestamp}`;
    const email3 = `test3-${timestamp}@example.com`;

    console.log(`\n3. Testing Invalid Format: "${username3}"`);
    const res3 = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email3, password, name: 'Test User 3', username: username3 })
    });

    if (res3.status === 401) {
        const err = await res3.json();
        if (err.message === 'Username must contain only letters and numbers') {
            console.log('   [PASS] Invalid format rejected correctly.');
        } else {
            console.log(`   [FAIL] Rejected but wrong message: ${err.message}`);
        }
    } else {
        console.log(`   [FAIL] Registration should have failed but got: ${res3.status}`);
    }
}

main().catch(console.error);
