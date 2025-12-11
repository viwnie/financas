'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TransactionForm from '@/components/transaction-form';
import { format } from 'date-fns';
import { Trash2, Filter } from 'lucide-react';
import { getCategoryDisplayName } from '@/lib/utils'; // Import at top
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { pt, es, enUS } from 'date-fns/locale';

const dateLocales: Record<string, any> = { pt, es, en: enUS };

interface Transaction {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: string;
    description?: string;
    date: string;
    category: { name: string; color?: string | null; translations?: any[] };
    isShared: boolean;
    isFixed: boolean;
    creatorId: string;
    installmentsCount?: number;
    participants: {
        userId: string;
        shareAmount: string;
        sharePercent: string;
        baseShareAmount?: string;
        baseSharePercent?: string;
        status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXITED';
        placeholderName?: string;
        user?: { name: string; username: string; avatarMimeType?: string | null };
    }[];
}

const getContrastColor = (hexcolor: string | null | undefined) => {
    if (!hexcolor) return '#1e40af'; // default blue-800
    // If hex is short (e.g. #FFF), expand it
    let hex = hexcolor.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? '#000000' : '#FFFFFF';
};

export default function TransactionsPage() {
    const { token, user } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { locale, t } = useLanguage();

    // Removed local getCategoryDisplayName as it is now imported

    const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
    const [year, setYear] = useState<string>(String(new Date().getFullYear()));
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);

    const { data: transactions = [] } = useQuery<Transaction[]>({
        queryKey: ['transactions', month, year, typeFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (month) params.append('month', month);
            if (year) params.append('year', year);
            if (typeFilter !== 'ALL') params.append('type', typeFilter);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/transactions?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch transactions');
            return res.json();
        },
        enabled: !!token,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/transactions/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to delete');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });

    const respondMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/transactions/${id}/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error('Failed to respond');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });

    const leaveMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/transactions/${id}/leave`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to leave');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });

    const respondAllMutation = useMutation({
        mutationFn: async (status: 'ACCEPTED' | 'REJECTED') => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/transactions/actions/respond-all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error('Failed to respond all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success(t('notifications.allDeleted')); // Reusing for consistency or new key? "All invitations responded"
        },
    });

    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        type: 'DELETE' | 'LEAVE' | 'REJECT' | null;
        id: string | null;
        title: string;
        description: string;
        variant: 'default' | 'destructive';
    }>({
        isOpen: false,
        type: null,
        id: null,
        title: '',
        description: '',
        variant: 'default',
    });

    const handleConfirm = () => {
        if (!confirmation.id || !confirmation.type) return;

        switch (confirmation.type) {
            case 'DELETE':
                deleteMutation.mutate(confirmation.id);
                break;
            case 'LEAVE':
                leaveMutation.mutate(confirmation.id);
                break;
            case 'REJECT':
                respondMutation.mutate({ id: confirmation.id, status: 'REJECTED' });
                break;
        }
        setConfirmation(prev => ({ ...prev, isOpen: false }));
    };

    const openConfirmation = (type: 'DELETE' | 'LEAVE' | 'REJECT', id: string) => {
        let title = '';
        let description = '';
        let variant: 'default' | 'destructive' = 'default';

        switch (type) {
            case 'DELETE':
                title = t('transactions.confirmDeleteTitle');
                description = t('transactions.confirmDeleteDesc');
                variant = 'destructive';
                break;
            case 'LEAVE':
                title = t('transactions.confirmLeaveTitle');
                description = t('transactions.confirmLeaveDesc');
                variant = 'destructive';
                break;
            case 'REJECT':
                title = t('transactions.confirmRejectTitle');
                description = t('transactions.confirmRejectDesc');
                variant = 'destructive';
                break;
        }

        setConfirmation({
            isOpen: true,
            type,
            id,
            title,
            description,
            variant,
        });
    };

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: new Date(2024, i).toLocaleString(locale, { month: 'long' })
    }));

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h1 className="text-3xl font-bold">{t('transactions.title')}</h1>
                    <div className="flex gap-2">
                        {transactions.some(t => t.participants.some(p => p.userId === user?.id && p.status === 'PENDING')) && (
                            <>
                                <Button size="sm" onClick={() => respondAllMutation.mutate('ACCEPTED')} className="bg-green-600 hover:bg-green-700 text-white">
                                    {t('transactions.acceptAll')}
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => respondAllMutation.mutate('REJECTED')}>
                                    {t('transactions.rejectAll')}
                                </Button>
                            </>
                        )}
                        <Button variant="outline" onClick={() => window.open('http://localhost:3000/transactions/export', '_blank')}>
                            {t('transactions.exportCSV')}
                        </Button>
                    </div>
                </div>

                {/* Inline Creation Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('transactions.addTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionForm onSuccess={() => { }} />
                    </CardContent>
                </Card>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg border">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{t('transactions.filters')}</span>
                    </div>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder={t('transactions.type')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">{t('transactions.allTypes')}</SelectItem>
                            <SelectItem value="INCOME">{t('transactions.income')}</SelectItem>
                            <SelectItem value="EXPENSE">{t('transactions.expense')}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder={t('transactions.month')} />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder={t('transactions.year')} />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((y) => (
                                <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        className="dark:bg-white dark:text-black dark:hover:bg-gray-200"
                        onClick={() => {
                            const now = new Date();
                            setMonth(String(now.getMonth() + 1));
                            setYear(String(now.getFullYear()));
                        }}
                    >
                        {t('transactions.today')}
                    </Button>
                </div>

                {/* Responsive Table */}
                <div className="rounded-md border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3">{t('transactions.table.date')}</th>
                                    <th className="px-6 py-3">{t('transactions.table.description')}</th>
                                    <th className="px-6 py-3">{t('transactions.table.category')}</th>
                                    <th className="px-6 py-3">{t('transactions.table.type')}</th>
                                    <th className="px-6 py-3">{t('transactions.table.amount')}</th>
                                    <th className="px-6 py-3">{t('transactions.table.status')}</th>
                                    <th className="px-6 py-3">{t('transactions.table.users')}</th>
                                    <th className="px-6 py-3 text-right">{t('transactions.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-4 text-center text-muted-foreground">
                                            {t('transactions.noTransactions')}
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((transaction) => {
                                        const isCreator = transaction.creatorId === user?.id;
                                        const myParticipant = transaction.participants.find(p => p.userId === user?.id);

                                        let displayAmount = parseFloat(transaction.amount);
                                        let shareLabel = "";

                                        if (transaction.isShared && myParticipant) {
                                            // If pending, show the proposed amount (baseShareAmount)
                                            // If accepted, show the effective amount (shareAmount)
                                            const amountToShow = myParticipant.status === 'PENDING'
                                                ? (myParticipant.baseShareAmount || myParticipant.shareAmount)
                                                : myParticipant.shareAmount;

                                            displayAmount = parseFloat(amountToShow);
                                            shareLabel = `(${t('transactions.myShare')})`;
                                        }

                                        const acceptedCount = transaction.participants.filter(p => p.status === 'ACCEPTED' && p.userId !== transaction.creatorId).length;
                                        const totalInvited = transaction.participants.filter(p => p.userId !== transaction.creatorId).length;

                                        const catColor = transaction.category.color;

                                        return (
                                            <tr key={transaction.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 font-medium whitespace-nowrap">
                                                    {format(new Date(transaction.date), 'MMM d, yyyy', { locale: dateLocales[locale] || enUS })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {transaction.description || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!catColor ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}`}
                                                        style={catColor ? { backgroundColor: catColor, color: getContrastColor(catColor) } : undefined}
                                                    >
                                                        {getCategoryDisplayName(transaction.category, locale)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-bold ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {t(`transactions.type.${transaction.type}`)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold">
                                                    <div className="flex flex-col">
                                                        <span>${parseFloat(transaction.amount).toFixed(2)} {transaction.isShared && <span className="text-xs font-normal text-muted-foreground">({t('transactions.total')})</span>}</span>
                                                        {transaction.isShared && (
                                                            <span className="text-xs text-primary font-medium">
                                                                ${displayAmount.toFixed(2)} <span className="text-muted-foreground font-normal">{shareLabel}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        {transaction.isShared && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 w-fit">
                                                                {t('transactions.shared')}
                                                            </span>
                                                        )}
                                                        {transaction.isFixed && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 w-fit">
                                                                {t('transactions.fixed')}
                                                            </span>
                                                        )}
                                                        {isCreator && transaction.isShared && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {acceptedCount}/{totalInvited} Accepted
                                                            </span>
                                                        )}
                                                        {!isCreator && myParticipant && (
                                                            <span className={`text-xs font-medium ${myParticipant.status === 'PENDING' ? 'text-yellow-600' :
                                                                myParticipant.status === 'ACCEPTED' ? 'text-green-600' :
                                                                    'text-red-600'
                                                                }`}>
                                                                {t('transactions.table.status')}: {myParticipant.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {transaction.isShared ? (
                                                        <div className="flex flex-col gap-1">
                                                            {transaction.participants.map((p, idx) => {
                                                                const name = p.user?.name || p.placeholderName || 'Unknown';
                                                                const isCreatorParticipant = p.userId === transaction.creatorId;
                                                                if (isCreatorParticipant) return null;

                                                                const statusColor =
                                                                    p.status === 'ACCEPTED' ? 'text-green-600' :
                                                                        p.status === 'REJECTED' ? 'text-red-600' :
                                                                            p.status === 'EXITED' ? 'text-gray-500' :
                                                                                'text-yellow-600';

                                                                const username = p.user?.username;
                                                                const hasAvatar = !!p.user?.avatarMimeType;

                                                                return (
                                                                    <div key={idx} className="flex items-center gap-2">
                                                                        <Avatar className="h-6 w-6">
                                                                            <AvatarImage
                                                                                src={hasAvatar && username ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/avatar/${username}` : undefined}
                                                                                alt={name}
                                                                                className="object-cover"
                                                                            />
                                                                            <AvatarFallback className="text-[10px]">{name.charAt(0).toUpperCase()}</AvatarFallback>
                                                                        </Avatar>
                                                                        <span className={`text-xs font-medium ${statusColor}`}>
                                                                            {name}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                            {transaction.participants.filter(p => p.userId !== transaction.creatorId).length === 0 && <span className="text-xs text-muted-foreground">No other participants</span>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {isCreator && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                    onClick={() => setEditTransaction(transaction)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                                    onClick={() => openConfirmation('DELETE', transaction.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {!isCreator && myParticipant?.status === 'PENDING' && (
                                                            <>
                                                                <Button size="sm" variant="default" onClick={() => respondMutation.mutate({ id: transaction.id, status: 'ACCEPTED' })}>{t('notifications.accept')}</Button>
                                                                <Button size="sm" variant="destructive" onClick={() => openConfirmation('REJECT', transaction.id)}>{t('notifications.reject')}</Button>
                                                            </>
                                                        )}
                                                        {!isCreator && myParticipant?.status === 'ACCEPTED' && (
                                                            <Button size="sm" variant="outline" onClick={() => openConfirmation('LEAVE', transaction.id)}>Leave</Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <ConfirmationModal
                    open={confirmation.isOpen}
                    onOpenChange={(open) => setConfirmation(prev => ({ ...prev, isOpen: open }))}
                    onConfirm={handleConfirm}
                    title={confirmation.title}
                    description={confirmation.description}
                    variant={confirmation.variant}
                />

                <Dialog open={!!editTransaction} onOpenChange={(open) => !open && setEditTransaction(null)}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t('transactions.editTitle')}</DialogTitle>
                        </DialogHeader>
                        {editTransaction && (
                            <TransactionForm
                                initialData={editTransaction}
                                transactionId={editTransaction.id}
                                onSuccess={() => setEditTransaction(null)}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </div >
        </div >
    );
}
