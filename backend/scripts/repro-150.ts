


const BASE_URL = 'http://localhost:3000';

async function main() {
    console.log('Starting reproduction...');

    // 1. Signup Creator
    const email = `creator-${Date.now()}@example.com`;
    const password = 'password123';
    const signupRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'Creator', username: `creator${Date.now()}` })
    });
    const { access_token: token } = await signupRes.json();
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 2. Create Transaction with 3 participants (Creator + 2 others)
    // Total 300.
    // Creator: Implicit.
    // User A (External): 100 (33.33%).
    // User B (Pending): 100 (33.33%).
    // Creator (Implicit): 100 (33.33%).

    // Note: The form sends participants list. Creator is NOT in the list sent to backend usually?
    // Let's check the form.
    // Form: "participants" field array.
    // "defaultParticipants = ... filter(p => p.userId !== user?.id)"
    // So the form only contains OTHER participants.
    // But when submitting?
    // "participants: z.array(participantSchema).optional()"
    // The backend `create` method:
    // "const participantsToCreate = createTransactionDto.participants || [];"
    // "const creatorShare = totalAmount - participantsToCreate.reduce((sum, p) => sum + p.amount, 0);"
    // So the Creator is indeed implicit.

    // If I send:
    // Amount: 300.
    // Participants:
    // 1. Name: "Ext", Amount: 100, Percent: 33.33, Status: ACCEPTED (External)
    // 2. Name: "Pend", Amount: 100, Percent: 33.33, Status: PENDING (Pending)

    // Creator Share = 300 - 200 = 100.
    // Creator Percent = 100/300 = 33.33.

    console.log('Creating transaction...');
    const transactionRes = await fetch(`${BASE_URL}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            amount: 300,
            description: 'Repro 150',
            date: new Date().toISOString(),
            type: 'EXPENSE',
            categoryName: 'Test',
            isShared: true,
            participants: [
                {
                    name: 'External',
                    amount: 100,
                    percent: 33.33,
                    // No userId -> External -> ACCEPTED
                },
                {
                    name: 'Pending',
                    userId: 'some-uuid-placeholder', // We need a real user ID for Pending?
                    // Or can we simulate pending with placeholder?
                    // Service: "const isPending = !!p.userId;"
                    // So we need a user ID for it to be PENDING.
                    amount: 100,
                    percent: 33.33
                }
            ]
        })
    });

    // We need a real user for Pending.
    // Let's create one.
    const emailB = `pending-${Date.now()}@example.com`;
    const signupResB = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailB, password, name: 'Pending User', username: `pending${Date.now()}` })
    });
    const { user: userB } = await signupResB.json();

    // Retry create with real user ID
    const transactionRes2 = await fetch(`${BASE_URL}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            amount: 300,
            description: 'Repro 150',
            date: new Date().toISOString(),
            type: 'EXPENSE',
            categoryName: 'Test',
            isShared: true,
            participants: [
                {
                    name: 'External',
                    amount: 100,
                    percent: 33.33
                },
                {
                    userId: userB.id,
                    amount: 100,
                    percent: 33.33
                }
            ]
        })
    });

    const transaction = await transactionRes2.json();
    console.log(`Transaction created: ${transaction.id}`);

    // Check shares
    const getRes = await fetch(`${BASE_URL}/transactions/${transaction.id}`, { headers });
    const tx = await getRes.json();

    console.log('Shares:');
    tx.participants.forEach((p: any) => {
        const name = p.user?.name || p.placeholderName || 'Creator';
        console.log(`${name} (${p.status}): Base=${p.baseShareAmount} (${p.baseSharePercent}%), Eff=${p.shareAmount} (${p.sharePercent}%)`);
    });

    // Also check Creator (who might be in the list or not?)
    // The backend `findOne` includes participants.
    // Does it include the creator as a participant?
    // Yes, usually.
}

main().catch(console.error);
