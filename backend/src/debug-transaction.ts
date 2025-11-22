
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const transaction = await prisma.transaction.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
            participants: {
                include: { user: true }
            },
            creator: true
        }
    });

    if (!transaction) {
        console.log('No transaction found');
        return;
    }

    console.log('Transaction:', {
        id: transaction.id,
        amount: transaction.amount,
        description: transaction.description,
        creator: transaction.creator.name,
        isShared: transaction.isShared
    });

    console.log('Participants:');
    transaction.participants.forEach(p => {
        console.log({
            id: p.id,
            name: p.user?.name || p.placeholderName || 'Unknown',
            userId: p.userId,
            status: p.status,
            shareAmount: p.shareAmount,
            sharePercent: p.sharePercent
        });
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
