import { getCategoryDisplayName } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { TransactionFormValues } from './use-transaction-form';
import { useState } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { Search } from 'lucide-react';

import { ColorSelectionPopover } from '@/components/ui/color-selection-popover';

interface TransactionCategoryInputProps {
    form: UseFormReturn<TransactionFormValues>;
    categorySuggestions: any[];
    isLoadingSuggestions: boolean;
    debouncedCategoryName: string;
    isAutoFilled: boolean;
    setIsAutoFilled: (val: boolean) => void;
    learnMutation: any;
    description: string;
    locale: string;
}
export function TransactionCategoryInput({
    form,
    categorySuggestions,
    isLoadingSuggestions,
    debouncedCategoryName,
    isAutoFilled,
    setIsAutoFilled,
    learnMutation,
    description,
    locale,
}: TransactionCategoryInputProps) {
    const { register, setValue, watch, formState: { errors } } = form;
    const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

    const { t } = useLanguage();

    return (
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10 pointer-events-none text-muted-foreground">
                <Search className="w-4 h-4" />
            </div>





            <div className="absolute left-9 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                <ColorSelectionPopover
                    selectedColor={watch('categoryColor')}
                    onSelect={(color) => setValue('categoryColor', color)}
                    showManageLink={true}
                    trigger={
                        <div
                            className="w-4 h-4 rounded-full border cursor-pointer shadow-sm transition-transform active:scale-95 hover:scale-110 ring-2 ring-background"
                            style={{ background: watch('categoryColor') || '#e2e8f0' }}
                            title={t('transactions.chooseColor')}
                        />
                    }
                />
            </div>

            <input
                type="hidden"
                {...register('categoryColor')}
            />

            <Input
                {...register('categoryName')}
                className="pl-16"
                placeholder={t('transactions.categoryInputPlaceholder')}
                autoComplete="off"
                onFocus={() => setShowCategorySuggestions(true)}
                onBlur={() => {
                    setTimeout(() => setShowCategorySuggestions(false), 200);
                }}
                onChange={(e) => {
                    setValue('categoryName', e.target.value);
                    setIsAutoFilled(false);
                    setShowCategorySuggestions(true);
                }}
            />
            {isAutoFilled && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-purple-600 dark:text-purple-300 flex items-center bg-purple-100/50 dark:bg-purple-500/20 border border-purple-200/50 dark:border-purple-500/30 backdrop-blur-sm px-2 py-0.5 rounded-full pointer-events-none shadow-sm animate-in fade-in zoom-in duration-300">
                    <span className="mr-1">✨</span> {t('transactions.suggested')}
                </div>
            )}

            {showCategorySuggestions && (debouncedCategoryName || categorySuggestions.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-background/95 backdrop-blur-sm border rounded-xl shadow-xl max-h-60 overflow-auto">
                    {isLoadingSuggestions ? (
                        <div className="p-4 text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            {t('transactions.searching')}
                        </div>
                    ) : categorySuggestions.length > 0 ? (
                        categorySuggestions.map((cat: any) => {
                            const displayName = getCategoryDisplayName(cat, locale);
                            return (
                                <div
                                    key={cat.id}
                                    className="px-4 py-2.5 hover:bg-muted/50 cursor-pointer text-sm flex justify-between items-center transition-colors border-b last:border-0 border-border/50"
                                    onClick={() => {
                                        setValue('categoryName', displayName);
                                        if (cat.color) {
                                            setValue('categoryColor', cat.color);
                                        }
                                        setIsAutoFilled(false);
                                        setShowCategorySuggestions(false);
                                        if (description) {
                                            learnMutation.mutate({ description, categoryId: cat.id });
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        {cat.color && (
                                            <div className="w-3 h-3 rounded-full shadow-sm ring-1 ring-border" style={{ background: cat.color }} />
                                        )}
                                        <span className="font-medium">{displayName}</span>
                                    </div>
                                    {cat.score > 0 && (
                                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md text-muted-foreground font-medium">
                                            {cat.matchType === 'CONTEXT' ? t('transactions.relevant') : ''}
                                        </span>
                                    )}
                                </div>
                            )
                        })
                    ) : (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                            {t('transactions.noCategoriesFound')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
