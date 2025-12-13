import React, { useEffect, useState } from 'react';
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
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

export function MoneyInput({
    amount,
    currency,
    onAmountChange,
    onCurrencyChange,
    disabled,
    className,
    placeholder
}: MoneyInputProps) {
    const [inputValue, setInputValue] = useState('');

    // Update input value when amount changes externally
    useEffect(() => {
        if (amount === undefined || amount === null || amount === 0) {
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

        // Format back to string for display
        const locale = getCurrencyLocale(currency);
        const formatted = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numberValue);

        setInputValue(formatted);
        onAmountChange(numberValue);
    };

    return (
        <div className={cn("relative flex items-center", className)}>
            <div className="absolute left-0 top-0 bottom-0 flex items-center z-10">
                <Select
                    value={currency}
                    onValueChange={onCurrencyChange}
                    disabled={disabled}
                >
                    <SelectTrigger className="h-9 w-[70px] border-0 rounded-r-none bg-muted hover:bg-muted/80 focus:ring-0 focus:ring-offset-0 gap-1 px-2 text-muted-foreground shadow-none">
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
                className="pl-[80px] text-right font-mono"
                placeholder={placeholder || ''}
            />
        </div>
    );
}
