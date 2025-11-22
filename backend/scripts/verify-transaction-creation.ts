
import { PrismaClient, ParticipantStatus } from '@prisma/client';
import { TransactionsService } from '../src/transactions/transactions.service';
import { NotificationsGateway } from '../src/notifications/notifications.gateway';
import { NotificationsService } from '../src/notifications/notifications.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma.service';
import { CreateTransactionDto } from '../src/transactions/dto/create-transaction.dto';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Transaction Creation Verification...');

    // 1. Setup Users
    const creator = await prisma.user.create({
        data: {
            name: 'Creator User',
            username: `creator_${Date.now()}`,
            email: `creator_${Date.now()}@test.com`,
            password: 'password123',
        },
    });

    const friend = await prisma.user.create({
        data: {
            name: 'Friend User',
            username: `friend_${Date.now()}`,
            email: `friend_${Date.now()}@test.com`,
            password: 'password123',
        },
    });

    // 2. Setup External Friend
    const externalFriend = await prisma.externalFriend.create({
        data: {
            userId: creator.id,
            name: 'External John',
        },
    });

    console.log('Users created:', { creatorId: creator.id, friendId: friend.id, externalFriendId: externalFriend.id });

    // 3. Mock Services
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            TransactionsService,
            {
                provide: PrismaService,
                useValue: prisma,
            },
            {
                provide: NotificationsGateway,
                useValue: { server: { to: () => ({ emit: () => { } }) } },
            },
            {
                provide: NotificationsService,
                useValue: { create: () => { } },
            },
        ],
    }).compile();

    const transactionsService = module.get<TransactionsService>(TransactionsService);

    // 4. Create Transaction Payload (simulating TransactionForm output)
    const createDto: CreateTransactionDto = {
        type: 'EXPENSE',
        amount: 300,
        description: 'Dinner with mixed friends',
        date: new Date().toISOString(),
        categoryName: 'Food',
        isShared: true,
        participants: [
            // 1. Registered Friend
            {
                userId: friend.id,
                name: friend.name,
                amount: 100,
                percent: 33.33,
            },
            // 2. External Friend (Registered in ExternalFriend table)
            // FIX: We must pass userId: undefined/null for External Friends
            {
                userId: undefined,
                name: externalFriend.name,
                amount: 100,
                percent: 33.33
            }
        ]
    };

    try {
        console.log('Attempting to create transaction with CORRECT payload (userId: undefined for External)...');
        const result = await transactionsService.create(creator.id, createDto);
        console.log('✅ Transaction created successfully:', result.id);

        // Verify participants
        const transaction = await prisma.transaction.findUnique({
            where: { id: result.id },
            include: { participants: true }
        });

        if (!transaction) throw new Error('Transaction not found');

        console.log('Participants:', transaction.participants.map(p => ({
            userId: p.userId,
            placeholderName: p.placeholderName,
            status: p.status
        })));

        const externalP = transaction.participants.find(p => p.placeholderName === externalFriend.name);
        if (externalP && !externalP.userId && externalP.status === 'ACCEPTED') {
            console.log('✅ External friend correctly added as placeholder with ACCEPTED status');
        } else {
            console.error('❌ External friend verification failed', externalP);
        }
    } catch (e) {
        console.error('❌ Failed to create transaction:', e.message || e);
    }

    // Cleanup
    await prisma.transaction.deleteMany();
    await prisma.externalFriend.deleteMany();
    await prisma.user.deleteMany();
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
