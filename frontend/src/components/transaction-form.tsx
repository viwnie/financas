'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useTransactionForm } from './transaction-form/use-transaction-form';
import { TransactionCategoryInput } from './transaction-form/transaction-category-input';
import { TransactionDatePicker } from './transaction-form/transaction-date-picker';
import { TransactionParticipants } from './transaction-form/transaction-participants';
import { useLanguage } from '@/contexts/language-context';
import { MoneyInput } from '@/components/ui/money-input';

export default function TransactionForm({ onSuccess, initialData, transactionId }: { onSuccess?: () => void, initialData?: any, transactionId?: string }) {
    const { t } = useLanguage();
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
                        onAmountChange={(val) => {
                            setValue('amount', val, { shouldDirty: true, shouldValidate: true });
                        }}
                        onCurrencyChange={(val) => {
                            setValue('currency', val, { shouldDirty: true });
                        }}
                        type={type}
                        onTypeChange={(val) => setValue('type', val)}
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

                <div className="flex items-center gap-6 pt-8">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`isFixed-${transactionId || 'new'}`}
                            checked={watch('isFixed')}
                            onCheckedChange={(checked) => setValue('isFixed', checked as boolean)}
                        />
                        <Label htmlFor={`isFixed-${transactionId || 'new'}`}>{t('transactions.monthlyFixed')}</Label>
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
                        <Label htmlFor={`isShared-${transactionId || 'new'}`}>{t('transactions.shareWithFriends')}</Label>
                    </div>
                </div>
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
