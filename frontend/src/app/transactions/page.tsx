'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TransactionForm from '@/components/transaction-form';
import { format } from 'date-fns';
import { Trash2, Filter, Calendar, History, RotateCcw, Search, Plus, ArrowLeftRight, Upload, Download, Hash, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { getCategoryDisplayName, formatCurrency, getInitials } from '@/lib/utils'; // Import at top
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';
import { ConfirmationModal } from '@/components/confirmation-modal';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { pt, es, enUS } from 'date-fns/locale';
import { useDebounce } from '@/hooks/use-debounce';

const dateLocales: Record<string, any> = { pt, es, en: enUS };

interface Transaction {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: string;
    currency: string;
    description?: string;
    date: string;
    originalDate?: string;
    excludedDates?: string[];
    category: { name: string; color?: string | null; translations?: any[] };
    isShared: boolean;
    isFixed: boolean;
    recurrenceEndsAt?: string | null;
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

const getContrastColor = (color: string | null | undefined) => {
    if (!color) return '#FFFFFF'; // Default to white if no color

    // Extract all hex colors from the string
    const matches = color.match(/#[a-fA-F0-9]{3,6}/g);

    // If no hex colors found, default to white
    if (!matches || matches.length === 0) return '#FFFFFF';

    let totalYiq = 0;

    matches.forEach(match => {
        let hex = match.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }

        if (hex.length === 6) {
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            // YIQ equation
            totalYiq += ((r * 299) + (g * 587) + (b * 114)) / 1000;
        }
    });

    // Calculate average brightness
    const averageYiq = totalYiq / matches.length;

    // Use a higher threshold (150 instead of 128) to prefer white text on mid-tones
    return averageYiq >= 150 ? '#000000' : '#FFFFFF';
};

export default function TransactionsPage() {
    const { token, user } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { locale, t } = useLanguage();

    // Removed local getCategoryDisplayName as it is now imported

    const [monthsSelected, setMonthsSelected] = useState<string[]>([String(new Date().getMonth() + 1)]);
    const [yearsSelected, setYearsSelected] = useState<string[]>([String(new Date().getFullYear())]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const debouncedSearchTerm = useDebounce(searchTerm, 50);
    const [searchField, setSearchField] = useState<string>('DESCRIPTION');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [isFixedFilter, setIsFixedFilter] = useState<string>('ALL');
    const [isSharedFilter, setIsSharedFilter] = useState<string>('ALL');
    const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);

    const { data: transactions = [] } = useQuery<Transaction[]>({
        queryKey: ['transactions', monthsSelected, yearsSelected, typeFilter, isFixedFilter, isSharedFilter, debouncedSearchTerm, searchField],
        queryFn: async () => {
            const params = new URLSearchParams();
            monthsSelected.forEach(m => params.append('month', m));
            yearsSelected.forEach(y => params.append('year', y));
            if (typeFilter !== 'ALL') params.append('type', typeFilter);
            if (isFixedFilter !== 'ALL') params.append('isFixed', isFixedFilter === 'YES' ? 'true' : 'false');
            if (isSharedFilter !== 'ALL') params.append('isShared', isSharedFilter === 'YES' ? 'true' : 'false');
            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
                params.append('searchField', searchField);
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/transactions?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(t('transactions.errors.fetch'));
            return res.json();
        },
        placeholderData: keepPreviousData,
        enabled: !!token,
    });

    const summary = useMemo(() => {
        return transactions.reduce(
            (acc, transaction) => {
                let amount = parseFloat(transaction.amount || '0');
                if (transaction.isShared && transaction.participants?.length) {
                    const myParticipant = transaction.participants.find(p => p.userId === user?.id);
                    if (myParticipant) {
                        const amountToShow = myParticipant.status === 'PENDING'
                            ? (myParticipant.baseShareAmount || myParticipant.shareAmount)
                            : myParticipant.shareAmount;
                        amount = parseFloat(amountToShow || '0');
                    }
                }

                if (!Number.isFinite(amount)) amount = 0;
                acc.count += 1;
                if (transaction.type === 'INCOME') {
                    acc.income += amount;
                } else {
                    acc.expense += amount;
                }
                if (!acc.currency && transaction.currency) acc.currency = transaction.currency;
                return acc;
            },
            { count: 0, income: 0, expense: 0, currency: 'BRL' as string }
        );
    }, [transactions, user?.id]);

    const balance = summary.income - summary.expense;

    const statusLabels = useMemo(() => ({
        PENDING: t('transactions.status.pending'),
        ACCEPTED: t('transactions.status.accepted'),
        REJECTED: t('transactions.status.rejected'),
        EXITED: t('transactions.status.exited'),
    }), [t]);

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/transactions/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(t('transactions.errors.delete'));
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
            if (!res.ok) throw new Error(t('transactions.errors.respond'));
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
            if (!res.ok) throw new Error(t('transactions.errors.leave'));
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
            if (!res.ok) throw new Error(t('transactions.errors.respondAll'));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success(t('notifications.allDeleted')); // Reusing for consistency or new key? "All invitations responded"
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/transactions/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(t('transactions.errors.update'));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success(t('transactions.updatedToast'));
        },
    });

    const [recurrenceAction, setRecurrenceAction] = useState<'SINGLE' | 'ALL'>('SINGLE');
    const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
    const [recurrenceTransaction, setRecurrenceTransaction] = useState<Transaction | null>(null);

    const handleRecurrenceConfirm = () => {
        if (!recurrenceTransaction) return;

        if (recurrenceAction === 'ALL') {
            deleteMutation.mutate(recurrenceTransaction.id);
        } else {
            // Single (Exclude)
            const viewDate = new Date(recurrenceTransaction.date);
            const currentExcluded = recurrenceTransaction.excludedDates || [];
            const newExcluded = [...currentExcluded, viewDate.toISOString()];

            updateMutation.mutate({
                id: recurrenceTransaction.id,
                data: { excludedDates: newExcluded }
            });
        }
        setIsRecurrenceModalOpen(false);
        setRecurrenceTransaction(null);
    };

    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        type: 'DELETE' | 'LEAVE' | 'REJECT' | null;
        id: string | null;
        transaction?: Transaction | null;
        title: string;
        description: string;
        variant: 'default' | 'destructive';
    }>({
        isOpen: false,
        type: null,
        id: null,
        transaction: null,
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

    const openConfirmation = (type: 'DELETE' | 'LEAVE' | 'REJECT', id: string, transaction?: Transaction) => {
        // Intercept DELETE for Recurring Transactions
        if (type === 'DELETE' && transaction?.isFixed) {
            setRecurrenceTransaction(transaction);
            setRecurrenceAction('SINGLE'); // Default
            setIsRecurrenceModalOpen(true);
            return;
        }

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
            transaction,
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
    // Default range: 2000 to 2050 (or current year + 5 if greater)
    // You requested "current year" context like 2025 -> 2000-2050.
    // Let's make it static 2000-2050 for simplicity or dynamic?
    // User asked "suggest 2000 to 2050".
    const startYear = 2000;
    const endYear = 2050;
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => ({
        value: String(endYear - i), // Descending order
        label: String(endYear - i)
    }));

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-3">
                        <span className="app-chip">{t('transactions.chip')}</span>
                        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gradient">{t('transactions.title')}</h1>
                        <p className="text-muted-foreground">{t('transactions.subtitle')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            className="rounded-full"
                            onClick={() => document.getElementById('transaction-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {t('transactions.addTitle')}
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-full bg-background/60"
                            onClick={() => toast.info(t('transactions.comingSoon'))}
                        >
                            <ArrowLeftRight className="mr-2 h-4 w-4" />
                            {t('transactions.transfer')}
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-full bg-background/60"
                            onClick={() => toast.info(t('transactions.comingSoon'))}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {t('transactions.import')}
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-full bg-background/60"
                            onClick={() => window.open('http://localhost:3000/transactions/export', '_blank')}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {t('transactions.exportCSV')}
                        </Button>
                        {transactions.some(t => t.participants.some(p => p.userId === user?.id && p.status === 'PENDING')) && (
                            <>
                                <Button size="sm" onClick={() => respondAllMutation.mutate('ACCEPTED')} className="rounded-full bg-green-600 hover:bg-green-700 text-white">
                                    {t('transactions.acceptAll')}
                                </Button>
                                <Button size="sm" variant="destructive" className="rounded-full" onClick={() => respondAllMutation.mutate('REJECTED')}>
                                    {t('transactions.rejectAll')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="app-card p-4">
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            <span>{t('transactions.title')}</span>
                            <span className="rounded-full bg-muted/40 p-2 text-muted-foreground">
                                <Hash className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-4 text-2xl font-semibold">{summary.count}</div>
                    </div>
                    <div className="app-card p-4">
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            <span>{t('transactions.expense')}</span>
                            <span className="rounded-full bg-muted/40 p-2 text-red-500">
                                <TrendingDown className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-4 text-2xl font-semibold">{formatCurrency(summary.expense, locale, summary.currency)}</div>
                    </div>
                    <div className="app-card p-4">
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            <span>{t('transactions.income')}</span>
                            <span className="rounded-full bg-muted/40 p-2 text-emerald-500">
                                <TrendingUp className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-4 text-2xl font-semibold">{formatCurrency(summary.income, locale, summary.currency)}</div>
                    </div>
                    <div className="app-card p-4">
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            <span>{t('dashboard.balance')}</span>
                            <span className="rounded-full bg-muted/40 p-2 text-primary">
                                <Wallet className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-4 text-2xl font-semibold">{formatCurrency(balance, locale, summary.currency)}</div>
                    </div>
                </div>

                {/* Inline Creation Form */}
                <Card id="transaction-form" className="app-card border-none">
                    <CardHeader>
                        <CardTitle>{t('transactions.addTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionForm onSuccess={() => { }} />
                    </CardContent>
                </Card>

                {/* Filters */}
                <div className="app-panel p-6 space-y-4">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                        {/* Top Row: Search */}
                        <div className="flex gap-2 w-full lg:w-auto flex-1">
                            <Select value={searchField} onValueChange={setSearchField}>
                                <SelectTrigger className="w-[140px] shrink-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DESCRIPTION">{t('transactions.searchField.description')}</SelectItem>
                                    <SelectItem value="CATEGORY">{t('transactions.searchField.category')}</SelectItem>
                                    <SelectItem value="STATUS">{t('transactions.searchField.status')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative w-full max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder={t('transactions.searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full max-w-md pl-9"
                                />
                            </div>
                        </div>

                        {/* Top Row: Date & Reset */}
                        <div className="flex gap-2 w-full lg:w-auto">
                            <div className="w-full lg:w-[150px]">
                                <MultiSelect
                                    options={months}
                                    selected={monthsSelected}
                                    onChange={setMonthsSelected}
                                    placeholder={t('transactions.month')}
                                    width="w-full"
                                />
                            </div>
                            <div className="w-full lg:w-[100px]">
                                <MultiSelect
                                    options={years}
                                    selected={yearsSelected}
                                    onChange={setYearsSelected}
                                    placeholder={t('transactions.year')}
                                    width="w-full"
                                    creatable
                                />
                            </div>
                            <Button
                                variant="outline"
                                className="rounded-full bg-background/60"
                                onClick={() => {
                                    const now = new Date();
                                    setMonthsSelected([String(now.getMonth() + 1)]);
                                    setYearsSelected([String(now.getFullYear())]);
                                    setSearchTerm('');
                                    setTypeFilter('ALL');
                                    setIsFixedFilter('ALL');
                                    setIsSharedFilter('ALL');
                                }}
                                title={t('transactions.resetFilters')}
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                {t('common.reset')}

                            </Button>
                        </div>
                    </div>

                    {/* Second Row: Quick Filters */}
                    <div className="flex flex-wrap gap-2 items-center pt-2 border-t">
                        <div className="flex items-center text-sm text-muted-foreground mr-2">
                            <Filter className="h-4 w-4 mr-2" />
                            {t('transactions.filters')}
                        </div>

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue placeholder={t('transactions.type')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t('transactions.allTypes')}</SelectItem>
                                <SelectItem value="INCOME">{t('transactions.income')}</SelectItem>
                                <SelectItem value="EXPENSE">{t('transactions.expense')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={isFixedFilter} onValueChange={setIsFixedFilter}>
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue placeholder={t('transactions.filter.recurring')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t('transactions.filter.allRecurring')}</SelectItem>
                                <SelectItem value="YES">{t('transactions.filter.onlyRecurring')}</SelectItem>
                                <SelectItem value="NO">{t('transactions.filter.onlyOneTime')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={isSharedFilter} onValueChange={setIsSharedFilter}>
                            <SelectTrigger className="w-[150px] h-8 text-xs">
                                <SelectValue placeholder={t('transactions.filter.shared')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t('transactions.filter.allShared')}</SelectItem>
                                <SelectItem value="YES">{t('transactions.filter.onlyShared')}</SelectItem>
                                <SelectItem value="NO">{t('transactions.filter.onlyPrivate')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="ml-auto flex items-center gap-1 rounded-full border border-border/60 bg-background/60 p-1">
                            {[
                                { label: t('transactions.quickAll'), value: 'ALL' },
                                { label: t('transactions.income'), value: 'INCOME' },
                                { label: t('transactions.expense'), value: 'EXPENSE' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setTypeFilter(option.value)}
                                    className={`px-3 py-1 text-xs rounded-full transition-colors ${typeFilter === option.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Responsive Table */}
                <div className="app-panel overflow-hidden border-none">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-primary/5">
                                <tr>
                                    <th className="px-6 py-3">{t('transactions.table.date')}</th>
                                    <th className="px-6 py-3">{t('transactions.table.description')}</th>
                                    <th className="px-6 py-3">{t('transactions.table.category')}</th>
                                    <th className="px-6 py-3">{t('transactions.table.type')}</th>
                                    <th className="px-6 py-3">{t('transactions.table.amount')}</th>
                                    <th className="px-6 py-3">{t('transactions.table.status')}</th>
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
                                            <tr key={`${transaction.id}-${transaction.date}`} className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors">
                                                <td className="px-6 py-4 font-medium whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                                        {format(new Date(transaction.date), 'MMM d, yyyy', { locale: dateLocales[locale] || enUS })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {transaction.description || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!catColor ? 'bg-primary/15 text-primary' : ''}`}
                                                        style={catColor ? { background: catColor, color: getContrastColor(catColor) } : undefined}
                                                    >
                                                        {getCategoryDisplayName(transaction.category, locale)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${transaction.type === 'INCOME' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                                        {t(`transactions.type.${transaction.type}`)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold">
                                                    <div className="flex flex-col">
                                                        <span>{formatCurrency(transaction.amount, locale, transaction.currency)} {transaction.isShared && <span className="text-xs font-normal text-muted-foreground">({t('transactions.total')})</span>}</span>
                                                        {transaction.isShared && (
                                                            <span className="text-xs text-primary font-medium">
                                                                {formatCurrency(displayAmount, locale, transaction.currency)} <span className="text-muted-foreground font-normal">{shareLabel}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            {transaction.isShared && (
                                                                <span className="inline-flex flex-col items-start px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                                    <span>{t('transactions.shared')}</span>
                                                                    <span className="text-[10px] whitespace-nowrap opacity-90">• {acceptedCount}/{totalInvited} {t('transactions.acceptedLabel')}</span>
                                                                </span>
                                                            )}
                                                            {transaction.isShared && (
                                                                <div className="flex -space-x-2">
                                                                    {transaction.participants.map((p, idx) => {
                                                                        const name = p.user?.name || p.placeholderName || t('common.unknown');
                                                                        const isCreatorParticipant = p.userId === transaction.creatorId;
                                                                        if (isCreatorParticipant) return null;

                                                                        const statusBorder =
                                                                            p.status === 'ACCEPTED' ? 'border-green-500' :
                                                                                p.status === 'REJECTED' ? 'border-red-500' :
                                                                                    p.status === 'EXITED' ? 'border-gray-500' :
                                                                                        'border-yellow-500';

                                                                        const username = p.user?.username;
                                                                        const hasAvatar = !!p.user?.avatarMimeType;

                                                                        return (
                                                                            <div key={idx} className="relative z-0 hover:z-10 transition-all" title={`${name} (${p.status})`}>
                                                                                <Avatar className={`h-6 w-6 border-2 ring-2 ring-background ${statusBorder}`}>
                                                                                    <AvatarImage
                                                                                        src={hasAvatar && username ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/avatar/${username}` : undefined}
                                                                                        alt={name}
                                                                                        className="object-cover"
                                                                                    />
                                                                                    <AvatarFallback className="text-[9px]">{getInitials(name)}</AvatarFallback>
                                                                                </Avatar>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {transaction.isFixed && !transaction.recurrenceEndsAt && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 w-fit">
                                                                {t('transactions.fixed')}
                                                            </span>
                                                        )}

                                                        {!isCreator && myParticipant && (
                                                            <span className={`text-xs font-medium ${myParticipant.status === 'PENDING' ? 'text-yellow-600' :
                                                                myParticipant.status === 'ACCEPTED' ? 'text-green-600' :
                                                                    'text-red-600'
                                                                }`}>
                                                                {t('transactions.table.status')}: {statusLabels[myParticipant.status] || myParticipant.status}
                                                            </span>
                                                        )}
                                                    </div>
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
                                                                {transaction.isFixed && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                        title={t('transactions.goToOriginal')}
                                                                        onClick={() => {
                                                                            if (transaction.originalDate) {
                                                                                const orig = new Date(transaction.originalDate);
                                                                                setMonthsSelected([String(orig.getMonth() + 1)]);
                                                                                setYearsSelected([String(orig.getFullYear())]);
                                                                                toast.info(t('transactions.navigatedToOriginal'));
                                                                            }
                                                                        }}
                                                                    >
                                                                        <History className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                                    onClick={() => openConfirmation('DELETE', transaction.id, transaction)}
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
                                                            <Button size="sm" variant="outline" onClick={() => openConfirmation('LEAVE', transaction.id)}>{t('transactions.leave')}</Button>
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
                <Dialog open={isRecurrenceModalOpen} onOpenChange={setIsRecurrenceModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('transactions.deleteRecurringTitle')}</DialogTitle>
                            <DialogDescription>
                                {t('transactions.deleteRecurringDesc')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <RadioGroup value={recurrenceAction} onValueChange={(v: any) => setRecurrenceAction(v)}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="SINGLE" id="single" />
                                    <Label htmlFor="single">{t('transactions.deleteSingle')}</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="ALL" id="all" />
                                    <Label htmlFor="all">{t('transactions.deleteAll')}</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsRecurrenceModalOpen(false)}>{t('common.cancel')}</Button>
                            <Button variant="destructive" onClick={handleRecurrenceConfirm}>{t('common.confirm')}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

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
            </div>
        </AppShell>
    );
}
