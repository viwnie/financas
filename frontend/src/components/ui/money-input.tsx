import React, { useEffect, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CURRENCIES, getCurrencyLocale, getCurrencySymbol } from '@/lib/currencies';
import { cn } from '@/lib/utils';

interface MoneyInputProps {
    amount: number | undefined;
    currency: string;
    onAmountChange: (value: number) => void;
    onCurrencyChange: (currency: string) => void;
    type?: 'INCOME' | 'EXPENSE';
    onTypeChange?: (type: 'INCOME' | 'EXPENSE') => void;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

export const MoneyInputComponent = React.forwardRef<HTMLDivElement, MoneyInputProps>(({
    amount,
    currency,
    onAmountChange,
    onCurrencyChange,
    type,
    onTypeChange,
    disabled,
    className,
    placeholder
}, ref) => {
    const [inputValue, setInputValue] = useState('');

    // Update input value when amount changes externally
    useEffect(() => {
        if (amount === undefined || amount === null || amount === 0 || Number.isNaN(amount)) {
            setInputValue('');
            return;
        }

        // Format the amount according to the currency's locale
        const locale = getCurrencyLocale(currency);
        const formatted = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);

        setInputValue(formatted);
    }, [amount, currency]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove all non-digits
        const rawValue = e.target.value.replace(/\D/g, '');

        if (!rawValue) {
            setInputValue('');
            onAmountChange(0);
            return;
        }

        // Convert to number (divided by 100 for decimals)
        const numberValue = parseInt(rawValue, 10) / 100;

        if (Number.isNaN(numberValue)) {
            setInputValue('');
            onAmountChange(0);
            return;
        }

        // Format back to string for display
        const locale = getCurrencyLocale(currency);
        const formatted = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numberValue);

        setInputValue(formatted);
        onAmountChange(numberValue);
    };

    const isIncome = type === 'INCOME';
    const showTypeSelector = !!onTypeChange;

    return (
        <div className={cn("relative flex items-center", className)}>
            <div className="absolute left-0 top-0 bottom-0 flex items-center z-10">
                {showTypeSelector && (
                    <Select
                        value={type}
                        onValueChange={(val) => onTypeChange(val as 'INCOME' | 'EXPENSE')}
                        disabled={disabled}
                    >
                        <SelectTrigger
                            className={cn(
                                "h-9 w-[60px] border-0 rounded-r-none bg-muted hover:bg-muted/80 focus:ring-0 focus:ring-offset-0 gap-1 px-2 shadow-none justify-center",
                                isIncome ? "text-emerald-600" : "text-red-500"
                            )}
                        >
                            <SelectValue>
                                {isIncome ? <Plus className="h-5 w-5 text-emerald-600" strokeWidth={3} /> : <Minus className="h-5 w-5 text-red-500" strokeWidth={3} />}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="INCOME" className="text-emerald-600 font-bold text-base">
                                <span className="flex items-center gap-2"><Plus className="h-4 w-4 text-emerald-600" /> Receita</span>
                            </SelectItem>
                            <SelectItem value="EXPENSE" className="text-red-500 font-bold text-base">
                                <span className="flex items-center gap-2"><Minus className="h-4 w-4 text-red-500" /> Despesa</span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                )}

                <Select
                    value={currency}
                    onValueChange={onCurrencyChange}
                    disabled={disabled}
                >
                    <SelectTrigger
                        className={cn(
                            "h-9 w-[60px] border-0 bg-muted hover:bg-muted/80 focus:ring-0 focus:ring-offset-0 gap-1 px-2 text-muted-foreground shadow-none",
                            showTypeSelector ? "rounded-none border-l-0" : "rounded-r-none"
                        )}
                    >
                        <SelectValue placeholder="Moeda">
                            {getCurrencySymbol(currency)}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {CURRENCIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                                <span className="font-medium mr-2">{c.symbol}</span>
                                {c.code}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleInputChange}
                disabled={disabled}
                className={cn(
                    "text-right font-mono font-medium text-sm",
                    showTypeSelector ? "pl-[120px]" : "pl-[70px]",
                    isIncome ? "text-emerald-600" : "text-red-500"
                )}
                placeholder={placeholder || ''}
            />
        </div>
    );
});

export const MoneyInput = React.memo(MoneyInputComponent);
