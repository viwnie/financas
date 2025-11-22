'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { CalendarIcon, Plus, X, Search, UserPlus, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const participantSchema = z.object({
    id: z.string().optional(),
    userId: z.string().nullable().optional(),
    name: z.string().optional(),
    amount: z.coerce.number().optional(),
    percent: z.coerce.number().optional(),
    status: z.string().optional(),
});

const transactionSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    amount: z.coerce.number().min(0.01, 'Amount must be positive'),
    description: z.string().optional(),
    date: z.date(),
    categoryName: z.string().min(1, 'Category is required'),
    isFixed: z.boolean().optional(),
    installmentsCount: z.coerce.number().optional(),
    isShared: z.boolean().optional(),
    participants: z.array(participantSchema).optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function TransactionForm({ onSuccess, initialData, transactionId }: { onSuccess?: () => void, initialData?: any, transactionId?: string }) {
    const { token, user } = useAuthStore();
    const queryClient = useQueryClient();
    const [error, setError] = useState('');
    const [friendSearch, setFriendSearch] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const defaultParticipants = initialData?.participants
        ? initialData.participants
            .filter((p: any) => p.userId !== user?.id)
            .map((p: any) => ({
                id: p.id,
                userId: p.userId,
                name: p.user?.name || p.placeholderName || 'Unknown',
                amount: parseFloat(p.baseShareAmount ?? p.shareAmount),
                percent: parseFloat(p.baseSharePercent ?? p.sharePercent),
                status: p.status
            }))
        : [];

    const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema) as any,
        defaultValues: {
            type: initialData?.type || 'EXPENSE',
            amount: initialData ? parseFloat(initialData.amount) : undefined,
            description: initialData?.description || '',
            date: initialData ? new Date(initialData.date) : new Date(),
            categoryName: initialData?.category?.name || '',
            isFixed: initialData?.isFixed || false,
            installmentsCount: initialData?.installmentsCount || 1,
            isShared: initialData?.isShared || false,
            participants: defaultParticipants,
        },
    });

    const { fields, append, remove, update, replace } = useFieldArray({
        control,
        name: "participants",
    });

    const type = watch('type');
    const totalAmount = watch('amount');
    const isShared = watch('isShared');

    const participants = watch('participants');
    const prevTotalAmount = useRef(totalAmount);

    // Recalculate splits when total amount changes
    useEffect(() => {
        // Only run if totalAmount actually changed from the previous value
        // This prevents overwriting loaded values on initial mount
        if (totalAmount !== prevTotalAmount.current) {
            prevTotalAmount.current = totalAmount;

            if (totalAmount > 0 && fields.length > 0) {
                fields.forEach((field, index) => {
                    if (field.percent) {
                        const newAmount = (field.percent / 100) * totalAmount;
                        update(index, { ...field, amount: parseFloat(newAmount.toFixed(2)) });
                    }
                });
            }
        }
    }, [totalAmount]);

    const { data: friends = [] } = useQuery({
        queryKey: ['friends'],
        queryFn: async () => {
            const res = await fetch('http://localhost:3000/friends', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch friends');
            return res.json();
        },
        enabled: !!token && isShared,
    });

    const { data: sentRequests = [] } = useQuery({
        queryKey: ['sentRequests'],
        queryFn: async () => {
            const res = await fetch('http://localhost:3000/friends/sent', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch sent requests');
            return res.json();
        },
        enabled: !!token && isShared,
    });

    const { data: searchResults = [] } = useQuery({
        queryKey: ['userSearch', friendSearch],
        queryFn: async () => {
            if (friendSearch.length < 2) return [];
            const res = await fetch(`http://localhost:3000/users/search?q=${friendSearch}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!token && isShared && friendSearch.length >= 2,
    });

    const { data: externalFriends = [] } = useQuery<{ id: string | null, name: string }[]>({
        queryKey: ['externalFriends'],
        queryFn: async () => {
            const res = await fetch('http://localhost:3000/friends/external', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch external friends');
            return res.json();
        },
        enabled: !!token && isShared,
    });

    const addFriendMutation = useMutation({
        mutationFn: async (username: string) => {
            const res = await fetch('http://localhost:3000/friends/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ username }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to send request');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
            toast.success('Friend request sent!');
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    // Combine and sort results
    const getFilteredResults = () => {
        if (!friendSearch) return [];

        const searchLower = friendSearch.toLowerCase();
        const addedUserIds = new Set(fields.map(p => p.userId).filter(Boolean));
        const addedNames = new Set(fields.map(p => p.name?.toLowerCase()));

        // 1. Internal Friends (Accepted)
        const internalMatches = friends.filter((f: any) =>
            f.name.toLowerCase().includes(searchLower) &&
            !addedUserIds.has(f.id)
        ).map((f: any) => ({ ...f, type: 'FRIEND' }));

        // 2. External Friends
        const externalMatches = externalFriends.filter((f: any) =>
            f.name.toLowerCase().includes(searchLower) &&
            !addedNames.has(f.name.toLowerCase())
        ).map((f: any) => ({ ...f, type: 'EXTERNAL' }));

        // 3. Pending Friends (Sent Requests)
        const pendingMatches = sentRequests.filter((req: any) =>
            req.addressee.name.toLowerCase().includes(searchLower)
        ).map((req: any) => ({ ...req.addressee, type: 'PENDING' }));

        // 4. Global Users (Not friends)
        const globalMatches = searchResults.filter((u: any) =>
            !internalMatches.some((f: any) => f.id === u.id) &&
            !pendingMatches.some((p: any) => p.id === u.id) &&
            !addedUserIds.has(u.id) &&
            u.id !== user?.id // Exclude self
        ).map((u: any) => ({ ...u, type: 'GLOBAL' }));

        return [...internalMatches, ...externalMatches, ...pendingMatches, ...globalMatches];
    };

    const filteredResults = getFilteredResults();

    const mutation = useMutation({
        mutationFn: async (data: TransactionFormValues) => {
            const url = transactionId
                ? `http://localhost:3000/transactions/${transactionId}`
                : 'http://localhost:3000/transactions';

            const method = transactionId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to save transaction');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success(transactionId ? 'Transação atualizada!' : 'Transação adicionada!');
            if (onSuccess) onSuccess();
        },
        onError: (err) => {
            setError(err.message);
            toast.error('Erro ao salvar transação');
        },
    });

    const onSubmit = (data: TransactionFormValues) => {
        setError('');

        if (data.isShared && data.participants && data.participants.length > 0) {
            // Calculate total proposed amount (including pending)
            const totalParticipantsAmount = data.participants.reduce((acc, curr) => acc + (curr.amount || 0), 0);

            // We allow the sum to exceed totalAmount because Pending users + Active users > Total
            // But we should check that Accepted participants don't exceed Total?
            // Or just rely on backend validation?
            // Let's remove the strict client-side check for now, or relax it.
            // Actually, if we are proposing shares, the sum of PROPOSED shares should probably be <= Total?
            // If I invite 3 people, I propose 25/25/25/25. Sum = 100.
            // If I invite 1 Pending (33) and 1 External (33). I pay 33. Sum = 100.
            // The issue is that the Creator's share *dynamically* increases.
            // But in the FORM, we are setting the *base* shares.
            // So the sum of base shares should be <= Total.

            if (totalParticipantsAmount > data.amount + 0.1) {
                setError('A soma das partes dos participantes não pode exceder o valor total da transação.');
                return;
            }
        }

        mutation.mutate(data);
    };

    const distributeEqually = (currentFields: any[]) => {
        const currentTotal = totalAmount || 0;

        // Total participants = creator (1) + added participants
        const totalParticipants = currentFields.length + 1;
        const sharePercent = 100 / totalParticipants;
        const shareAmount = currentTotal / totalParticipants;

        return currentFields.map(field => ({
            ...field,
            percent: parseFloat(sharePercent.toFixed(2)),
            amount: parseFloat(shareAmount.toFixed(2))
        }));
    };

    const handleAddFriend = (friend: any) => {
        const isExternal = friend.type === 'EXTERNAL';
        const newParticipant = {
            userId: isExternal ? undefined : friend.id,
            name: friend.name,
            status: isExternal ? 'ACCEPTED' : 'PENDING'
        };
        const updatedFields = [...fields, newParticipant];
        const distributedFields = distributeEqually(updatedFields);
        replace(distributedFields);
        setFriendSearch('');
    };

    const handleAddAdHoc = () => {
        if (friendSearch.trim()) {
            const newParticipant = { name: friendSearch.trim(), status: 'ACCEPTED' };
            const updatedFields = [...fields, newParticipant];
            const distributedFields = distributeEqually(updatedFields);
            replace(distributedFields);
            setFriendSearch('');
        }
    };

    const handleRemoveParticipant = (index: number) => {
        const updatedFields = fields.filter((_, i) => i !== index);
        const distributedFields = distributeEqually(updatedFields);
        replace(distributedFields);
    };

    const handleSplitChange = (index: number, field: 'amount' | 'percent', value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return;

        if (field === 'amount') {
            const percent = (numValue / totalAmount) * 100;
            setValue(`participants.${index}.amount`, numValue);
            setValue(`participants.${index}.percent`, parseFloat(percent.toFixed(2)));
        } else {
            const amount = (numValue / 100) * totalAmount;
            setValue(`participants.${index}.percent`, numValue);
            setValue(`participants.${index}.amount`, parseFloat(amount.toFixed(2)));
        }
    };

    // Calculate "You Pay"
    // Logic: Proportional Split
    // 1. Creator Base Share = Total - Sum(All Participants Base Amounts)
    // 2. Total Active Base = Creator Base + Sum(Accepted Participants Base Amounts)
    // 3. Creator Ratio = Creator Base / Total Active Base
    // 4. Creator Dynamic Share = Total * Creator Ratio
    const calculateMyShare = () => {
        if (!totalAmount) return 0;

        const participantsList = participants || [];
        const totalParticipantsAmount = participantsList.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        // Creator's proposed base share
        const creatorBaseShare = Math.max(0, totalAmount - totalParticipantsAmount);

        // Sum of base shares of ACCEPTED participants
        const acceptedBaseTotal = participantsList
            .filter(p => p.status === 'ACCEPTED')
            .reduce((acc, curr) => acc + (curr.amount || 0), 0);

        // Total base share of all ACTIVE participants (Creator + Accepted)
        // Note: Creator is always considered active/accepted
        const totalActiveBase = creatorBaseShare + acceptedBaseTotal;

        if (totalActiveBase <= 0) return 0; // Should not happen if totalAmount > 0

        const creatorRatio = creatorBaseShare / totalActiveBase;
        const creatorDynamicShare = totalAmount * creatorRatio;

        return creatorDynamicShare;
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-wrap gap-4 items-start">
                <div className="flex-1 min-w-[200px] space-y-2">
                    <Label>Descrição</Label>
                    <Input {...register('description')} placeholder="Descrição da transação" />
                </div>

                <div className="w-[140px] space-y-2">
                    <Label>Valor</Label>
                    <Input type="number" step="0.01" {...register('amount')} placeholder="0,00" />
                    {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
                    {isShared && totalAmount > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                            Você paga: <span className="font-medium text-primary">
                                R$ {calculateMyShare().toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>

                <div className="w-[140px] space-y-2">
                    <Label>Tipo</Label>
                    <Select onValueChange={(val) => setValue('type', val as 'INCOME' | 'EXPENSE')} defaultValue={type}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="INCOME">Receita</SelectItem>
                            <SelectItem value="EXPENSE">Despesa</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-[160px] space-y-2 flex flex-col">
                    <Label>Data</Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !watch('date') && "text-muted-foreground"
                                )}
                            >
                                {watch('date') ? (
                                    format(watch('date'), "dd/MM/yyyy")
                                ) : (
                                    <span>Selecione</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={watch('date')}
                                onSelect={(date) => {
                                    if (date) {
                                        setValue('date', date);
                                        setIsCalendarOpen(false);
                                    }
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 items-start">
                <div className="flex-1 min-w-[200px] space-y-2">
                    <Label>Categoria</Label>
                    <Input {...register('categoryName')} placeholder="Ex: Alimentação, Aluguel" />
                    {errors.categoryName && <p className="text-xs text-red-500">{errors.categoryName.message}</p>}
                </div>

                {type === 'EXPENSE' && (
                    <div className="w-[100px] space-y-2">
                        <Label>Parcelas</Label>
                        <Input type="number" min="1" {...register('installmentsCount')} placeholder="1" />
                    </div>
                )}

                <div className="flex items-center gap-6 pt-8">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`isFixed-${transactionId || 'new'}`}
                            checked={watch('isFixed')}
                            onCheckedChange={(checked) => setValue('isFixed', checked as boolean)}
                        />
                        <Label htmlFor={`isFixed-${transactionId || 'new'}`}>Fixo mensal</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`isShared-${transactionId || 'new'}`}
                            checked={watch('isShared')}
                            onCheckedChange={(checked) => {
                                setValue('isShared', checked as boolean);
                                if (!checked) {
                                    replace([]);
                                }
                            }}
                        />
                        <Label htmlFor={`isShared-${transactionId || 'new'}`}>Compartilhar com amigos</Label>
                    </div>
                </div>
            </div>

            {
                isShared && (
                    <div className="space-y-4 border p-4 rounded-md bg-muted/20">
                        <div className="space-y-2">
                            <Label>Adicionar Participantes</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar amigo ou digitar nome..."
                                    value={friendSearch}
                                    onChange={(e) => setFriendSearch(e.target.value)}
                                    className="pl-8"
                                />
                            </div>

                            {friendSearch && (
                                <div className="border rounded-md bg-background p-2 shadow-sm max-h-[200px] overflow-y-auto mt-2">
                                    {filteredResults.map((result: any) => (
                                        <div
                                            key={result.id || result.name}
                                            className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer rounded"
                                            onClick={() => {
                                                if (result.type === 'FRIEND' || result.type === 'EXTERNAL') {
                                                    handleAddFriend(result);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{result.name}</span>
                                                    {result.username && <span className="text-xs text-muted-foreground">@{result.username}</span>}
                                                </div>
                                                {result.type === 'FRIEND' && <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">Friend</span>}
                                                {result.type === 'EXTERNAL' && <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">External</span>}
                                            </div>

                                            {result.type === 'GLOBAL' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 px-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addFriendMutation.mutate(result.username);
                                                    }}
                                                >
                                                    <UserPlus className="h-4 w-4 mr-1" />
                                                    Add Friend
                                                </Button>
                                            )}

                                            {result.type === 'PENDING' && (
                                                <span className="flex items-center text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    Request Sent
                                                </span>
                                            )}

                                            {(result.type === 'FRIEND' || result.type === 'EXTERNAL') && (
                                                <Plus className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    ))}

                                    <div
                                        className="p-2 hover:bg-muted cursor-pointer rounded flex items-center gap-2 text-muted-foreground border-t mt-1"
                                        onClick={handleAddAdHoc}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add "{friendSearch}" (Non-registered)
                                    </div>
                                </div>
                            )}
                        </div>

                        {fields.length > 0 && (
                            <div className="space-y-3">
                                <Label>Participantes Selecionados</Label>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-3 bg-background p-3 rounded border">
                                        <div className="flex-1 font-medium">
                                            {field.name}
                                            {!field.userId && <span className="ml-2 text-xs text-muted-foreground">(Externo)</span>}
                                            {field.status === 'PENDING' && <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-1 rounded">Pendente</span>}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="relative w-[100px]">
                                                <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">R$</span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    className="pl-6 h-9"
                                                    {...register(`participants.${index}.amount`)}
                                                    onChange={(e) => handleSplitChange(index, 'amount', e.target.value)}
                                                />
                                            </div>
                                            <div className="relative w-[80px]">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="%"
                                                    className="pr-6 h-9"
                                                    {...register(`participants.${index}.percent`)}
                                                    onChange={(e) => handleSplitChange(index, 'percent', e.target.value)}
                                                />
                                                <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">%</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleRemoveParticipant(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end pt-4">
                <Button type="submit" className="w-[150px]" disabled={mutation.isPending}>
                    {mutation.isPending ? (transactionId ? 'Alterando...' : 'Salvando...') : (transactionId ? 'Alterar' : 'Salvar')}
                </Button>
            </div>
        </form >
    );
}
