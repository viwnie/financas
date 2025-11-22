'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TransactionForm from '@/components/transaction-form';
import { format } from 'date-fns';
import { Trash2, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit } from 'lucide-react';

interface Transaction {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: string;
    description?: string;
    date: string;
    category: { name: string };
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
        user?: { name: string; username: string };
    }[];
}

export default function TransactionsPage() {
    const { token, user } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();

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

            const res = await fetch(`http://localhost:3000/transactions?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch transactions');
            return res.json();
        },
        enabled: !!token,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`http://localhost:3000/transactions/${id}`, {
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
            const res = await fetch(`http://localhost:3000/transactions/${id}/respond`, {
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
            const res = await fetch(`http://localhost:3000/transactions/${id}/leave`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to leave');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
                title = 'Apagar Transação';
                description = 'Tem certeza que deseja apagar esta transação? Esta ação não pode ser desfeita.';
                variant = 'destructive';
                break;
            case 'LEAVE':
                title = 'Sair da Transação';
                description = 'Tem certeza que deseja sair desta transação compartilhada?';
                variant = 'destructive';
                break;
            case 'REJECT':
                title = 'Recusar Convite';
                description = 'Tem certeza que deseja recusar o convite para esta transação?';
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

    const months = [
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h1 className="text-3xl font-bold">Transactions</h1>
                    <Button variant="outline" onClick={() => window.open('http://localhost:3000/transactions/export', '_blank')}>
                        Export CSV
                    </Button>
                </div>

                {/* Inline Creation Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Adicionar Nova Transação</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionForm onSuccess={() => { }} />
                    </CardContent>
                </Card>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg border">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Filters:</span>
                    </div>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Types</SelectItem>
                            <SelectItem value="INCOME">Income</SelectItem>
                            <SelectItem value="EXPENSE">Expense</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Year" />
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
                        Today
                    </Button>
                </div>

                {/* Responsive Table */}
                <div className="rounded-md border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Description</th>
                                    <th className="px-6 py-3">Category</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Users</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-4 text-center text-muted-foreground">
                                            No transactions found for the selected filters.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((t) => {
                                        const isCreator = t.creatorId === user?.id;
                                        const myParticipant = t.participants.find(p => p.userId === user?.id);

                                        let displayAmount = parseFloat(t.amount);
                                        let shareLabel = "";

                                        if (t.isShared && myParticipant) {
                                            // If pending, show the proposed amount (baseShareAmount)
                                            // If accepted, show the effective amount (shareAmount)
                                            const amountToShow = myParticipant.status === 'PENDING'
                                                ? (myParticipant.baseShareAmount || myParticipant.shareAmount)
                                                : myParticipant.shareAmount;

                                            displayAmount = parseFloat(amountToShow);
                                            shareLabel = "(My Share)";
                                        }

                                        const acceptedCount = t.participants.filter(p => p.status === 'ACCEPTED' && p.userId !== t.creatorId).length;
                                        const totalInvited = t.participants.filter(p => p.userId !== t.creatorId).length;

                                        return (
                                            <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 font-medium whitespace-nowrap">
                                                    {format(new Date(t.date), 'MMM d, yyyy')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {t.description || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                        {t.category.name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-bold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {t.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold">
                                                    <div className="flex flex-col">
                                                        <span>${parseFloat(t.amount).toFixed(2)} {t.isShared && <span className="text-xs font-normal text-muted-foreground">(Total)</span>}</span>
                                                        {t.isShared && (
                                                            <span className="text-xs text-primary font-medium">
                                                                ${displayAmount.toFixed(2)} <span className="text-muted-foreground font-normal">{shareLabel}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        {t.isShared && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 w-fit">
                                                                Shared
                                                            </span>
                                                        )}
                                                        {t.isFixed && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 w-fit">
                                                                Fixed
                                                            </span>
                                                        )}
                                                        {isCreator && t.isShared && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {acceptedCount}/{totalInvited} Accepted
                                                            </span>
                                                        )}
                                                        {!isCreator && myParticipant && (
                                                            <span className={`text-xs font-medium ${myParticipant.status === 'PENDING' ? 'text-yellow-600' :
                                                                myParticipant.status === 'ACCEPTED' ? 'text-green-600' :
                                                                    'text-red-600'
                                                                }`}>
                                                                Status: {myParticipant.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {t.isShared ? (
                                                        <div className="flex flex-col gap-1">
                                                            {t.participants.map((p, idx) => {
                                                                const name = p.user?.name || p.placeholderName || 'Unknown';
                                                                const isCreatorParticipant = p.userId === t.creatorId;
                                                                if (isCreatorParticipant) return null;

                                                                const statusColor =
                                                                    p.status === 'ACCEPTED' ? 'text-green-600' :
                                                                        p.status === 'REJECTED' ? 'text-red-600' :
                                                                            p.status === 'EXITED' ? 'text-gray-500' :
                                                                                'text-yellow-600';

                                                                return (
                                                                    <span key={idx} className={`text-xs font-medium ${statusColor}`}>
                                                                        {name}
                                                                    </span>
                                                                );
                                                            })}
                                                            {t.participants.filter(p => p.userId !== t.creatorId).length === 0 && <span className="text-xs text-muted-foreground">No other participants</span>}
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
                                                                    onClick={() => setEditTransaction(t)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                                    onClick={() => openConfirmation('DELETE', t.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {!isCreator && myParticipant?.status === 'PENDING' && (
                                                            <>
                                                                <Button size="sm" variant="default" onClick={() => respondMutation.mutate({ id: t.id, status: 'ACCEPTED' })}>Accept</Button>
                                                                <Button size="sm" variant="destructive" onClick={() => openConfirmation('REJECT', t.id)}>Reject</Button>
                                                            </>
                                                        )}
                                                        {!isCreator && myParticipant?.status === 'ACCEPTED' && (
                                                            <Button size="sm" variant="outline" onClick={() => openConfirmation('LEAVE', t.id)}>Leave</Button>
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
                            <DialogTitle>Editar Transação</DialogTitle>
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
