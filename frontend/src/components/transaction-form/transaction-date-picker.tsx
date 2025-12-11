import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TransactionDatePickerProps {
    date: Date;
    onSelect: (date: Date | undefined) => void;
}

export function TransactionDatePicker({ date, onSelect }: TransactionDatePickerProps) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    return (
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full pl-3 text-left font-normal",
                        !date && "text-muted-foreground"
                    )}
                >
                    {date ? (
                        format(date, "dd/MM/yyyy")
                    ) : (
                        <span>Selecione</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                        onSelect(d);
                        if (d) setIsCalendarOpen(false);
                    }}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
