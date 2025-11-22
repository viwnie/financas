
import { PrismaClient, ParticipantStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculateDynamicShares(transactionId: string) {
    console.log(`[recalculateDynamicShares] Starting for transaction ${transactionId}`);
    const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { participants: { include: { user: true } } }
    });

    if (!transaction) {
        console.log(`[recalculateDynamicShares] Transaction not found`);
        return;
    }

    // Find all ACCEPTED participants
    const activeParticipants = transaction.participants.filter(p => p.status === ParticipantStatus.ACCEPTED);
    console.log(`[recalculateDynamicShares] Found ${activeParticipants.length} active participants`);

    if (activeParticipants.length === 0) return;

    const totalAmount = Number(transaction.amount);
    const count = activeParticipants.length;

    // Penny Perfect Distribution
    const baseShare = Math.floor((totalAmount / count) * 100) / 100;
    const remainder = Math.round((totalAmount - (baseShare * count)) * 100) / 100;

    console.log(`[recalculateDynamicShares] Total: ${totalAmount}, Count: ${count}, Base: ${baseShare}, Remainder: ${remainder}`);

    let remainderPennies = Math.round(remainder * 100);

    for (let i = 0; i < count; i++) {
        const p = activeParticipants[i];
        let share = baseShare;
        if (remainderPennies > 0) {
            share = Number((share + 0.01).toFixed(2));
            remainderPennies--;
        }

        const percent = Number(((share / totalAmount) * 100).toFixed(2));

        console.log(`[recalculateDynamicShares] Updating participant ${p.id} (${p.user?.name || p.placeholderName || 'Creator'}) to ${share} (${percent}%)`);

        await prisma.transactionParticipant.update({
            where: { id: p.id },
            data: {
                shareAmount: share,
                sharePercent: percent
            }
        });
    }
}

const TRANSACTION_ID = "589e7380-d126-4b88-a88a-87c851a96c86"; // From previous debug output

recalculateDynamicShares(TRANSACTION_ID)
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
