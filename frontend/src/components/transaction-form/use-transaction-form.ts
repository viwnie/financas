import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray, UseFormReturn, FieldArrayWithId } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/contexts/language-context';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';

const participantSchema = z.object({
    id: z.string().optional(),
    userId: z.string().nullable().optional(),
    username: z.string().optional(),
    name: z.string().optional(),
    amount: z.coerce.number().optional(),
    percent: z.coerce.number().optional(),
    status: z.string().optional(),
    hasAvatar: z.boolean().optional(),
});

const createTransactionSchema = (t: (key: string) => string) => z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    amount: z.union([z.number(), z.string(), z.nan(), z.undefined(), z.null()])
        .transform((val) => Number(val || 0))
        .refine((val) => !isNaN(val) && val >= 0.01, t('errors.amountRequired')),
    currency: z.string().optional(),
    description: z.string().min(1, t('errors.descriptionRequired')),
    date: z.date(),
    categoryName: z.string().min(1, t('errors.categoryRequired')),
    categoryColor: z.string().optional(),
    isFixed: z.boolean().optional(),
    recurrenceEndsAt: z.date().optional(),
    installmentsCount: z.coerce.number().min(1, t('errors.installmentsMin')).optional(),
    isShared: z.boolean().optional(),
    participants: z.array(participantSchema).optional(),
});

// Base schema for type inference
const baseSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    amount: z.number(),
    currency: z.string().optional(),
    description: z.string().optional(),
    date: z.date(),
    categoryName: z.string().optional(),
    categoryColor: z.string().optional(),
    isFixed: z.boolean().optional(),
    recurrenceEndsAt: z.date().optional(),
    installmentsCount: z.number().optional(),
    isShared: z.boolean().optional(),
    participants: z.array(participantSchema).optional(),
});

export type TransactionFormValues = z.infer<typeof baseSchema>;

interface UseTransactionFormProps {
    onSuccess?: () => void;
    initialData?: any;
    transactionId?: string;
}

export function useTransactionForm({ onSuccess, initialData, transactionId }: UseTransactionFormProps) {
    const { token, user } = useAuthStore();
    const { locale, t } = useLanguage();
    const queryClient = useQueryClient();
    const [error, setError] = useState('');

    // Auto-fill state
    const [autoFilledCategory, setAutoFilledCategory] = useState<string | null>(null);
    const [isAutoFilled, setIsAutoFilled] = useState(false);

    const defaultValues = useMemo(() => {
        const participants = initialData?.participants
            ? initialData.participants
                .filter((p: any) => p.userId !== user?.id)
                .map((p: any) => ({
                    id: p.id,
                    userId: p.userId,
                    username: p.user?.username,
                    name: p.user?.name || p.placeholderName || 'Unknown',
                    amount: p.shareAmount !== null ? parseFloat(p.shareAmount) : parseFloat(p.baseShareAmount || '0'),
                    percent: p.sharePercent !== null ? parseFloat(p.sharePercent) : parseFloat(p.baseSharePercent || '0'),
                    status: p.status,
                    hasAvatar: !!p.user?.avatarMimeType
                }))
            : [];

        let defaultCurrency = 'USD';
        if (locale === 'pt') defaultCurrency = 'BRL';
        else if (locale === 'es') defaultCurrency = 'EUR';

        return {
            type: initialData?.type || 'EXPENSE',
            amount: initialData ? parseFloat(initialData.amount) : undefined,
            currency: initialData?.currency || defaultCurrency,
            description: initialData?.description || '',
            date: initialData ? new Date(initialData.date) : new Date(),
            categoryName: initialData?.category?.name || '',
            categoryColor: initialData?.category?.color || initialData?.categoryColor || '#e2e8f0',
            isFixed: initialData?.isFixed && (!initialData?.recurrenceEndsAt || new Date(initialData.recurrenceEndsAt) > new Date()),
            recurrenceEndsAt: initialData?.recurrenceEndsAt ? new Date(initialData.recurrenceEndsAt) : undefined,
            installmentsCount: initialData?.installmentsCount || 1,
            isShared: initialData?.isShared || false,
            participants: participants,
        };
    }, [initialData, user?.id, locale]);

    const schema = useMemo(() => createTransactionSchema(t), [t]);

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(schema) as any,
        defaultValues,
    });

    const { control, reset, watch, setValue, handleSubmit, formState: { errors, touchedFields } } = form;

    // Update currency when locale changes (only for new transactions)
    useEffect(() => {
        if (!initialData) {
            if (locale === 'pt') setValue('currency', 'BRL');
            else if (locale === 'es') setValue('currency', 'EUR');
            else setValue('currency', 'USD');
        }
    }, [locale, setValue, initialData]);

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "participants",
    });

    const prevAmountRef = useRef<number | undefined>(defaultValues.amount);

    useEffect(() => {
        if (initialData) {
            reset(defaultValues);
            prevAmountRef.current = defaultValues.amount;
        }
    }, [initialData, reset, defaultValues]);

    const description = watch('description');
    const categoryName = watch('categoryName');
    const totalAmount = watch('amount');
    const isShared = watch('isShared');

    const debouncedDescription = useDebounce(description, 500);
    const debouncedCategoryName = useDebounce(categoryName, 300);

    // Initial Queries
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

    // Suggestion logic
    useEffect(() => {
        if (prediction && prediction.category) {
            const currentCategoryName = form.getValues('categoryName');
            const isTouched = form.formState.touchedFields.categoryName;

            // Only apply if field is not touched, OR if it's empty, OR if we previously autofilled it
            // ensuring we don't overwrite user manual edits unless implicit overwrite is safe
            if (!isTouched && (!currentCategoryName || isAutoFilled) && description && description.length >= 3) {
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
    }, [prediction, isAutoFilled, description, setValue, form]); // Keeping isAutoFilled/description/form in deps is safer for closure correctness, but KEY is removing categoryName and touchedFields. Actually, strictly, removing categoryName is the fix.

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

    const [friendSearch, setFriendSearch] = useState('');

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

    const getFilteredResults = () => {
        if (!friendSearch) return [];

        const searchLower = friendSearch.toLowerCase();
        const addedUsernames = new Set(fields.map(p => p.username).filter(Boolean));
        const addedNames = new Set(fields.map(p => p.name?.toLowerCase()));

        const internalMatches = friends.filter((f: any) =>
            f.name.toLowerCase().includes(searchLower) &&
            !addedUsernames.has(f.username)
        ).map((f: any) => ({ ...f, type: 'FRIEND' }));

        const externalMatches = externalFriends.filter((f: any) =>
            f.name.toLowerCase().includes(searchLower) &&
            !addedNames.has(f.name.toLowerCase())
        ).map((f: any) => ({ ...f, type: 'EXTERNAL' }));

        const pendingMatches = sentRequests.filter((req: any) =>
            req.addressee.name.toLowerCase().includes(searchLower)
        ).map((req: any) => ({ ...req.addressee, type: 'PENDING' }));

        const globalMatches = searchResults.filter((u: any) =>
            !internalMatches.some((f: any) => f.id === u.id || f.username === u.username) &&
            !pendingMatches.some((p: any) => p.id === u.id || p.username === u.username) &&
            !addedUsernames.has(u.username) &&
            u.id !== user?.id
        ).map((u: any) => ({ ...u, type: 'GLOBAL' }));

        return [...internalMatches, ...externalMatches, ...pendingMatches, ...globalMatches];
    };

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

    const distributeEqually = (currentFields: any[]) => {
        const currentTotal = totalAmount || 0;
        const activeParticipants = currentFields.filter(p => p.status !== 'REJECTED');
        const totalSplitting = 1 + activeParticipants.length;
        const sharePercent = 100 / totalSplitting;
        const shareAmount = currentTotal / totalSplitting;

        return currentFields.map(field => {
            if (field.status === 'REJECTED') {
                return { ...field, percent: 0, amount: 0 };
            }
            return {
                ...field,
                percent: parseFloat(sharePercent.toFixed(2)),
                amount: parseFloat(shareAmount.toFixed(2))
            };
        });
    };

    const handleAddFriend = (friend: any) => {
        const isExternal = friend.type === 'EXTERNAL';
        const newParticipant = {
            userId: isExternal ? undefined : undefined,
            username: isExternal ? undefined : friend.username,
            name: friend.name,
            status: isExternal ? 'ACCEPTED' : 'PENDING',
            hasAvatar: !!friend.avatarMimeType
        };
        const updatedFields = [...fields, newParticipant];
        const distributedFields = distributeEqually(updatedFields);
        replace(distributedFields);
        setFriendSearch('');
    };

    const handleAddAdHoc = () => {
        if (friendSearch.trim()) {
            const newParticipant = { name: friendSearch.trim(), status: 'ACCEPTED', hasAvatar: false };
            const updatedFields = [...fields, newParticipant];
            const distributedFields = distributeEqually(updatedFields);
            replace(distributedFields);
            setFriendSearch('');
        }
    };

    const handleReinvite = (index: number) => {
        const updatedFields = fields.map((field, i) =>
            i === index ? { ...field, status: 'PENDING' } : field
        );
        const distributedFields = distributeEqually(updatedFields);
        replace(distributedFields);
        toast.info('Participante re-convidado. O valor será redistribuído.');
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



    // Auto-recalculate shares
    useEffect(() => {
        if (totalAmount !== prevAmountRef.current) {
            if (totalAmount && fields.length > 0) {
                const distributedFields = distributeEqually(fields);
                replace(distributedFields);
            }
            prevAmountRef.current = totalAmount;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalAmount]);



    const calculateMyShare = () => {
        if (!totalAmount) return 0;
        const participantsList = watch('participants') || [];
        const totalParticipantsAmount = participantsList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const creatorBaseShare = Math.max(0, totalAmount - totalParticipantsAmount);

        const activeParticipants = participantsList.filter(p => !p.status || p.status === 'ACCEPTED');
        const allBaseShares = [creatorBaseShare, ...activeParticipants.map(p => p.amount || 0)];
        const minBase = Math.min(...allBaseShares);
        const maxBase = Math.max(...allBaseShares);
        const isEffectivelyEqual = (maxBase - minBase) <= 0.011;

        if (isEffectivelyEqual && allBaseShares.length > 0) {
            return totalAmount / allBaseShares.length;
        }

        const totalActiveBase = creatorBaseShare + activeParticipants.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        if (totalActiveBase === 0) return totalAmount;
        return (creatorBaseShare / totalActiveBase) * totalAmount;
    };

    const onSubmit = (data: TransactionFormValues) => {
        setError('');

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

        const cleanedParticipants = data.participants?.map((p) => p);
        const cleanedData = { ...data, participants: cleanedParticipants };
        mutation.mutate({ ...cleanedData, language: locale } as any);
    };

    return {
        form,
        fields,
        append,
        remove,
        replace,
        onSubmit: handleSubmit(onSubmit),
        error,
        prediction,
        isAutoFilled,
        setIsAutoFilled,
        learnMutation,
        distributeEqually,
        calculateMyShare,
        token,
        locale,
        tokenUser: user,
        // New exports
        categorySuggestions,
        isLoadingSuggestions,
        debouncedCategoryName,
        friendSearch,
        setFriendSearch,
        filteredResults: getFilteredResults(),
        handleAddFriend,
        handleAddAdHoc,
        handleReinvite,
        handleRemoveParticipant,
        handleSplitChange,
        addFriendMutation,
        mutation,
    };
}
