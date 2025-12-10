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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { CalendarIcon, Plus, X, Search, UserPlus, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { useLanguage } from '@/contexts/language-context';

const participantSchema = z.object({
    id: z.string().optional(),
    userId: z.string().nullable().optional(),
    username: z.string().optional(),
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
    categoryColor: z.string().optional(),
    isFixed: z.boolean().optional(),
    installmentsCount: z.coerce.number().optional(),
    isShared: z.boolean().optional(),
    participants: z.array(participantSchema).optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function TransactionForm({ onSuccess, initialData, transactionId }: { onSuccess?: () => void, initialData?: any, transactionId?: string }) {
    const { token, user } = useAuthStore();
    const { locale } = useLanguage();
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
                username: p.user?.username,
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
            categoryColor: initialData?.category?.color || initialData?.categoryColor || '#e2e8f0',
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

    const description = watch('description');
    const categoryName = watch('categoryName');
    const debouncedDescription = useDebounce(description, 500);
    const debouncedCategoryName = useDebounce(categoryName, 300);
    const [autoFilledCategory, setAutoFilledCategory] = useState<string | null>(null);
    const [isAutoFilled, setIsAutoFilled] = useState(false);
    const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

    const { data: prediction } = useQuery({
        queryKey: ['predictCategory', debouncedDescription],
        queryFn: async () => {
            if (!debouncedDescription || debouncedDescription.length < 3) return null;
            const res = await fetch(`http://localhost:3000/categories/predict?description=${encodeURIComponent(debouncedDescription)}&language=${locale}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!token && !!debouncedDescription && debouncedDescription.length >= 3,
    });

    const { data: categorySuggestions = [], isLoading: isLoadingSuggestions } = useQuery({
        queryKey: ['searchCategories', debouncedCategoryName, debouncedDescription],
        queryFn: async () => {
            if (!debouncedCategoryName || debouncedCategoryName.length < 1) return [];
            const res = await fetch(`http://localhost:3000/categories/search?q=${encodeURIComponent(debouncedCategoryName)}&context=${encodeURIComponent(debouncedDescription || '')}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!token && !!debouncedCategoryName && debouncedCategoryName.length >= 1,
    });

    useEffect(() => {
        if (prediction && prediction.category) {
            // Auto-fill if category is empty OR if it was previously auto-filled and user hasn't changed it manually
            if (!categoryName || isAutoFilled) {
                setValue('categoryName', prediction.category.name);
                if (prediction.category.color) {
                    setValue('categoryColor', prediction.category.color);
                }
                setAutoFilledCategory(prediction.category.name);
                setIsAutoFilled(true);
                toast.info(`Categoria sugerida: ${prediction.category.name}`, {
                    description: 'Baseado na descrição',
                    icon: '✨'
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prediction, setValue]);

    const learnMutation = useMutation({
        mutationFn: async (data: { description: string, categoryId: string }) => {
            await fetch('http://localhost:3000/categories/learn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
        }
    });

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
        const addedUsernames = new Set(fields.map(p => p.username).filter(Boolean));
        const addedNames = new Set(fields.map(p => p.name?.toLowerCase()));

        // 1. Internal Friends (Accepted)
        const internalMatches = friends.filter((f: any) =>
            f.name.toLowerCase().includes(searchLower) &&
            !addedUsernames.has(f.username)
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
            !internalMatches.some((f: any) => f.id === u.id || f.username === u.username) &&
            !pendingMatches.some((p: any) => p.id === u.id || p.username === u.username) &&
            !addedUsernames.has(u.username) &&
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

    // Auto-recalculate shares when total amount changes
    useEffect(() => {
        if (totalAmount && fields.length > 0) {
            const distributedFields = distributeEqually(fields);
            // Only replace if values are actually different to avoid loops (though replace handles it reasonably well)
            // But strict check prevents potential loops if we add more dependencies
            replace(distributedFields);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalAmount]); // Only depend on totalAmount to trigger this recalculation logic

    const onSubmit = (data: TransactionFormValues) => {
        setError('');

        // Trigger learning if description exists and category is set
        if (data.description && prediction?.category && prediction.category.name === data.categoryName) {
            learnMutation.mutate({ description: data.description, categoryId: prediction.category.id });
        }

        if (data.isShared && data.participants && data.participants.length > 0) {
            const totalParticipantsAmount = data.participants.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            if (totalParticipantsAmount > data.amount + 0.1) {
                setError('A soma das partes dos participantes não pode exceder o valor total da transação.');
                return;
            }
        }

        const cleanedParticipants = data.participants?.map(({ status, ...p }) => p);
        const cleanedData = { ...data, participants: cleanedParticipants };

        mutation.mutate({ ...cleanedData, language: locale } as any);
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
            userId: isExternal ? undefined : undefined, // Don't send userId for internal friends, use username
            username: isExternal ? undefined : friend.username,
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

    // Calculate "You Pay" (Effective Share)
    const calculateMyShare = () => {
        if (!totalAmount) return 0;

        const participantsList = watch('participants') || [];
        const totalParticipantsAmount = participantsList.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        // 1. Creator's Proposed Base Share
        const creatorBaseShare = Math.max(0, totalAmount - totalParticipantsAmount);

        // 2. Simulate Backend Dynamic Redistribution (Effective Share)
        // Active = Status ACCEPTED (External/Ad-hoc usually ACCEPTED) or Creator
        const activeParticipants = participantsList.filter(p => !p.status || p.status === 'ACCEPTED');

        const totalActiveBase = creatorBaseShare + activeParticipants.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        if (totalActiveBase === 0) {
            // If everyone else is PENDING, Creator pays 100% temporarily
            return totalAmount;
        }

        // Proportional Redistribution among Active
        return (creatorBaseShare / totalActiveBase) * totalAmount;
    };

    // Helper to get translated name
    const getCategoryName = (cat: any) => {
        if (cat.translations && cat.translations.length > 0) {
            const exact = cat.translations.find((t: any) => t.language === locale);
            if (exact) return exact.name;

            const group = cat.translations.find((t: any) => t.language.startsWith(locale.split('-')[0]));
            if (group) return group.name;

            // Fallback to English or first
            const en = cat.translations.find((t: any) => t.language === 'en');
            if (en) return en.name;

            return cat.translations[0].name;
        }

        // Legacy fallback
        if (locale === 'pt' && cat.name_pt) return cat.name_pt;
        if (locale === 'en' && cat.name_en) return cat.name_en;
        if (locale === 'es' && cat.name_es) return cat.name_es;
        return cat.name;
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" >
            {/* ... (previous JSX) ... */}
            {/* I need to be careful not to replace the whole form */}
            {/* I will target the specific suggestion map block */}

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
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Input
                                {...register('categoryName')}
                                placeholder="Ex: Alimentação, Aluguel"
                                autoComplete="off"
                                onFocus={() => setShowCategorySuggestions(true)}
                                onBlur={() => {
                                    // Delay hiding to allow click on suggestion
                                    setTimeout(() => setShowCategorySuggestions(false), 200);
                                }}
                                onChange={(e) => {
                                    setValue('categoryName', e.target.value);
                                    setIsAutoFilled(false); // User manually typing
                                    setShowCategorySuggestions(true);
                                }}
                            />
                            {isAutoFilled && (
                                <div className="absolute right-2 top-2.5 text-xs text-purple-600 flex items-center bg-purple-50 px-2 rounded-full pointer-events-none">
                                    <span className="mr-1">✨</span> Sugerido
                                </div>
                            )}

                            {showCategorySuggestions && (debouncedCategoryName || categorySuggestions.length > 0) && (
                                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                                    {isLoadingSuggestions ? (
                                        <div className="p-2 text-sm text-center text-muted-foreground">
                                            Buscando...
                                        </div>
                                    ) : categorySuggestions.length > 0 ? (
                                        categorySuggestions.map((cat: any) => {
                                            const displayName = getCategoryName(cat);
                                            return (
                                                <div
                                                    key={cat.id}
                                                    className="px-4 py-2 hover:bg-muted cursor-pointer text-sm flex justify-between items-center"
                                                    onClick={() => {
                                                        setValue('categoryName', displayName);
                                                        if (cat.color) {
                                                            setValue('categoryColor', cat.color);
                                                        }
                                                        setIsAutoFilled(false);
                                                        setShowCategorySuggestions(false);
                                                        // Trigger learning immediately on selection if description exists
                                                        if (description) {
                                                            learnMutation.mutate({ description, categoryId: cat.id });
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {cat.color && (
                                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                                        )}
                                                        <span>{displayName}</span>
                                                    </div>
                                                    {cat.score > 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {cat.matchType === 'CONTEXT' ? 'Relevante' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="p-2 text-sm text-center text-muted-foreground">
                                            Nenhuma categoria encontrada
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <div
                                className="w-9 h-9 rounded-full border cursor-pointer shadow-sm flex items-center justify-center transition-transform active:scale-95"
                                style={{ backgroundColor: watch('categoryColor') || '#e2e8f0' }}
                                onClick={() => document.getElementById('category-color-picker')?.click()}
                                title="Escolher cor da categoria"
                            />
                            <input
                                id="category-color-picker"
                                type="color"
                                className="absolute opacity-0 w-0 h-0"
                                {...register('categoryColor')}
                            />
                        </div>
                    </div>
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
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage
                                                        src={result.username ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/avatar/${result.username}` : undefined}
                                                        alt={result.name}
                                                        className="object-cover"
                                                    />
                                                    <AvatarFallback>{result.name.charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
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
                                        <div className="flex-1 font-medium flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage
                                                    src={field.username ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/avatar/${field.username}` : undefined}
                                                    alt={field.name}
                                                    className="object-cover"
                                                />
                                                <AvatarFallback>{field.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                {field.name}
                                                {!field.username && !field.userId && <span className="ml-2 text-xs text-muted-foreground">(Externo)</span>}
                                                {field.status === 'PENDING' && transactionId && <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-1 rounded">Pendente</span>}
                                            </div>
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
