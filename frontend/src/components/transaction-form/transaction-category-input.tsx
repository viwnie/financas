import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { TransactionFormValues } from './use-transaction-form';
import { useState } from 'react';

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
    );
}
