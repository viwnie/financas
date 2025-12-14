import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RotateCcw, Trash2, Repeat, Users } from 'lucide-react';
import { useTransactionForm } from './transaction-form/use-transaction-form';
import { TransactionCategoryInput } from './transaction-form/transaction-category-input';
import { TransactionDatePicker } from './transaction-form/transaction-date-picker';
import { TransactionParticipants } from './transaction-form/transaction-participants';
import { useLanguage } from '@/contexts/language-context';
import { MoneyInput } from '@/components/ui/money-input';
import { Switch } from '@/components/ui/switch';

import { format } from "date-fns";

export default function TransactionForm({ onSuccess, initialData, transactionId }: { onSuccess?: () => void, initialData?: any, transactionId?: string }) {
    const { t } = useLanguage();
    const [stopRecurrenceOpen, setStopRecurrenceOpen] = React.useState(false);
    const [tempEndDate, setTempEndDate] = React.useState<Date>(new Date());
    const {
        form,
        fields,
        replace,
        onSubmit,
        error,
        prediction,
        isAutoFilled,
        setIsAutoFilled,
        learnMutation,
        calculateMyShare,
        locale,
        tokenUser,
        categorySuggestions,
        isLoadingSuggestions,
        debouncedCategoryName,
        friendSearch,
        setFriendSearch,
        filteredResults,
        handleAddFriend,
        handleAddAdHoc,
        handleReinvite,
        handleRemoveParticipant,
        handleSplitChange,
        addFriendMutation,
        mutation,
    } = useTransactionForm({ onSuccess, initialData, transactionId });

    const { register, setValue, watch, reset, formState: { errors, isDirty, dirtyFields } } = form;

    const type = watch('type');
    const totalAmount = watch('amount');
    const isShared = watch('isShared');
    const description = watch('description');

    return (
        <form onSubmit={onSubmit} className="space-y-4" >
            <div className="flex flex-wrap gap-4 items-start">
                <div className="w-[400px] space-y-2">
                    <Label>{t('transactions.description')}</Label>
                    <Input {...register('description')} placeholder={t('transactions.descriptionPlaceholder')} />
                    {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
                </div>

                <div className="w-[230px] space-y-2">
                    <Label>Tipo, Moeda e Valor</Label>
                    <MoneyInput
                        amount={totalAmount}
                        currency={watch('currency') || 'BRL'}
                        onAmountChange={useCallback((val: number) => {
                            setValue('amount', val, { shouldDirty: true, shouldValidate: true });
                        }, [setValue])}
                        onCurrencyChange={useCallback((val: string) => {
                            setValue('currency', val, { shouldDirty: true });
                        }, [setValue])}
                        type={type}
                        onTypeChange={useCallback((val: 'INCOME' | 'EXPENSE') => setValue('type', val), [setValue])}
                    />
                    {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
                    {isShared && (totalAmount || 0) > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                            {t('transactions.youPay')} <span className="font-medium text-primary">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: watch('currency') || 'BRL' }).format(calculateMyShare())}
                            </span>
                        </div>
                    )}
                </div>

                <div className="w-[160px] space-y-2 flex flex-col">
                    <Label>{t('transactions.date')}</Label>
                    <TransactionDatePicker
                        date={watch('date')}
                        onSelect={(date) => {
                            if (date) setValue('date', date);
                        }}
                    />
                </div>
            </div>

            <div className="flex flex-wrap gap-4 items-start">
                <div className="w-[400px] space-y-2">
                    <Label>{t('transactions.category')}</Label>
                    <TransactionCategoryInput
                        form={form}
                        categorySuggestions={categorySuggestions}
                        isLoadingSuggestions={isLoadingSuggestions}
                        debouncedCategoryName={debouncedCategoryName || ''}
                        isAutoFilled={isAutoFilled}
                        setIsAutoFilled={setIsAutoFilled}
                        learnMutation={learnMutation}
                        description={description || ''}
                        locale={locale}
                    />
                    {errors.categoryName && <p className="text-xs text-red-500">{errors.categoryName.message}</p>}
                </div>

                {type === 'EXPENSE' && (
                    <div className="w-[100px] space-y-2">
                        <Label>{t('transactions.installments')}</Label>
                        <Input type="number" min="1" {...register('installmentsCount')} placeholder="1" />
                        {errors.installmentsCount && <p className="text-xs text-red-500">{errors.installmentsCount.message}</p>}
                    </div>
                )}

            </div>

            <div className="space-y-4 pt-4">

                <div className="flex flex-col gap-4">
                    <label
                        htmlFor={`isFixed-${transactionId || 'new'}`}
                        className="border rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Repeat className="w-4 h-4 text-muted-foreground" />
                                <span className="text-base font-medium cursor-pointer">
                                    {t('transactions.monthlyFixed')}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('transactions.monthlyFixedDescription')}
                            </p>
                        </div>
                        <Switch
                            id={`isFixed-${transactionId || 'new'}`}
                            checked={watch('isFixed')}
                            onCheckedChange={(checked) => {
                                if (!checked) {
                                    // User trying to turn off
                                    setValue('isFixed', false); // Visually off immediately

                                    // Only show stop recurrence UI if it was ALREADY fixed in the database
                                    if (initialData?.isFixed) {
                                        setTempEndDate(new Date());
                                        setStopRecurrenceOpen(true);
                                    } else {
                                        setStopRecurrenceOpen(false);
                                    }
                                } else {
                                    // User turning on
                                    setValue('isFixed', true);
                                    setValue('recurrenceEndsAt', undefined);
                                    setStopRecurrenceOpen(false);
                                }
                            }}
                        />
                    </label>

                    {stopRecurrenceOpen && (
                        <div className="pl-6 border-l-2 border-muted ml-1 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1">
                                <h4 className="font-medium text-sm text-foreground">{t('transactions.stopRecurrenceTitle')}</h4>
                                <p className="text-xs text-muted-foreground">{t('transactions.stopRecurrenceDesc')}</p>
                            </div>

                            <div className="flex items-end gap-2">
                                <div className="space-y-2">
                                    <Label>Data final</Label>
                                    <TransactionDatePicker
                                        date={tempEndDate}
                                        onSelect={(date) => date && setTempEndDate(date)}
                                    />
                                </div>
                                <Button size="sm" variant="secondary" onClick={(e) => {
                                    e.preventDefault();
                                    // Confirming end date
                                    setValue('recurrenceEndsAt', tempEndDate);
                                    setStopRecurrenceOpen(false);
                                }}>Confirmar fim</Button>
                                <Button size="sm" variant="ghost" onClick={(e) => {
                                    e.preventDefault();
                                    setStopRecurrenceOpen(false);
                                    setValue('isFixed', true); // Revert to on
                                }}>Cancelar</Button>
                            </div>
                        </div>
                    )}
                </div>

                <label
                    htmlFor={`isShared-${transactionId || 'new'}`}
                    className="border rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                >
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-base font-medium cursor-pointer">
                                {t('transactions.shareWithFriends')}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('transactions.shareWithFriendsDescription')}
                        </p>
                    </div>
                    <Switch
                        id={`isShared-${transactionId || 'new'}`}
                        checked={watch('isShared')}
                        onCheckedChange={(checked) => {
                            setValue('isShared', checked as boolean);
                            if (!checked) {
                                replace([]);
                            }
                        }}
                    />
                </label>
            </div>

            <TransactionParticipants
                isShared={!!isShared}
                fields={fields}
                friendSearch={friendSearch}
                setFriendSearch={setFriendSearch}
                filteredResults={filteredResults}
                handleAddFriend={handleAddFriend}
                handleAddAdHoc={handleAddAdHoc}
                addFriendMutation={addFriendMutation}
                handleReinvite={handleReinvite}
                handleRemoveParticipant={handleRemoveParticipant}
                handleSplitChange={handleSplitChange}
                register={register}
                transactionId={transactionId}
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 pt-4">
                {isDirty && Object.keys(dirtyFields).some(key => {
                    if (key === 'currency') return false;
                    if (key === 'amount') return (totalAmount || 0) > 0;
                    return true;
                }) && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                reset();
                                setIsAutoFilled(false);
                                setFriendSearch('');
                            }}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            {transactionId ? <RotateCcw className="w-4 h-4 mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            {transactionId ? t('transactions.revert') : t('transactions.clear')}
                        </Button>
                    )}
                <Button type="submit" className="w-[150px]" disabled={mutation.isPending}>
                    {mutation.isPending ? (transactionId ? t('transactions.updating') : t('transactions.saving')) : (transactionId ? t('transactions.update') : t('transactions.save'))}
                </Button>
            </div>
        </form >
    );
}
