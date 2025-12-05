import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ParticipantStatus } from '@prisma/client';

@Injectable()
export class TransactionSharesService {
    constructor(private prisma: PrismaService) { }

    async recalculateDynamicShares(transactionId: string) {
        console.log(`[recalculateDynamicShares] Starting for transaction ${transactionId}`);
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { participants: { include: { user: true } } }
        });

        if (!transaction) {
            console.log(`[recalculateDynamicShares] Transaction not found`);
            return;
        }

        const activeParticipants = transaction.participants.filter(p => p.status === ParticipantStatus.ACCEPTED);
        const pendingParticipants = transaction.participants.filter(p => p.status === ParticipantStatus.PENDING);

        console.log(`[recalculateDynamicShares] Found ${activeParticipants.length} active, ${pendingParticipants.length} pending`);

        // 1. Reset Pending Users (Effective Share = 0, Base Share preserved)
        for (const p of pendingParticipants) {
            // Ensure base shares are set if missing (migration fallback)
            const baseAmount = p.baseShareAmount !== null ? p.baseShareAmount : p.shareAmount;
            const basePercent = p.baseSharePercent !== null ? p.baseSharePercent : p.sharePercent;

            await this.prisma.transactionParticipant.update({
                where: { id: p.id },
                data: {
                    shareAmount: 0,
                    sharePercent: 0,
                    baseShareAmount: baseAmount, // Save if it was null
                    baseSharePercent: basePercent
                }
            });
        }

        if (activeParticipants.length === 0) return;

        const totalAmount = Number(transaction.amount);

        // 2. Calculate Total Active Base Amount
        let totalActiveBaseAmount = 0;
        const activeWithBase = activeParticipants.map(p => {
            const basePercent = p.baseSharePercent !== null ? Number(p.baseSharePercent) : Number(p.sharePercent);
            const baseAmount = p.baseShareAmount !== null ? Number(p.baseShareAmount) : Number(p.shareAmount);
            totalActiveBaseAmount += baseAmount;
            return { ...p, basePercent, baseAmount };
        });

        console.log(`[recalculateDynamicShares] Total Amount: ${totalAmount}, Total Active Base Amount: ${totalActiveBaseAmount}`);

        // 3. Distribute proportionally
        if (totalActiveBaseAmount > 0) {
            let remainingAmount = totalAmount;

            for (let i = 0; i < activeWithBase.length; i++) {
                const p = activeWithBase[i];
                const isLast = i === activeWithBase.length - 1;

                let share = 0;
                let percent = 0;

                if (isLast) {
                    share = Number(remainingAmount.toFixed(2));
                } else {
                    const ratio = p.baseAmount / totalActiveBaseAmount;
                    share = Number((ratio * totalAmount).toFixed(2));
                    remainingAmount -= share;
                }

                percent = Number(((share / totalAmount) * 100).toFixed(2));

                console.log(`[recalculateDynamicShares] Updating ${p.user?.name || p.placeholderName} (Base: ${p.baseAmount}) -> New: ${share} (${percent}%)`);

                await this.prisma.transactionParticipant.update({
                    where: { id: p.id },
                    data: {
                        shareAmount: share,
                        sharePercent: percent,
                        baseShareAmount: p.baseAmount, // Ensure saved
                        baseSharePercent: p.basePercent
                    }
                });
            }
        } else {
            // Fallback to Equal Split if no base amounts (shouldn't happen usually)
            const count = activeParticipants.length;
            const baseShare = Math.floor((totalAmount / count) * 100) / 100;
            const remainder = Math.round((totalAmount - (baseShare * count)) * 100) / 100;
            let remainderPennies = Math.round(remainder * 100);

            for (let i = 0; i < count; i++) {
                const p = activeParticipants[i];
                let share = baseShare;
                if (remainderPennies > 0) {
                    share = Number((share + 0.01).toFixed(2));
                    remainderPennies--;
                }
                const percent = Number(((share / totalAmount) * 100).toFixed(2));

                await this.prisma.transactionParticipant.update({
                    where: { id: p.id },
                    data: { shareAmount: share, sharePercent: percent }
                });
            }
        }
    }
}
