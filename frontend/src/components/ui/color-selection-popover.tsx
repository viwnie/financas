import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ColorSelectionContent } from './color-selection-content';

export const PRESET_GRADIENTS = [
    'linear-gradient(135deg, #fce38a, #f38181)',
    'linear-gradient(135deg, #FAD961, #F76B1C)',
    'linear-gradient(135deg, #FFCF71, #2376DD)',
    'linear-gradient(135deg, #ff9a9e, #fecfef)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    'linear-gradient(135deg, #fad0c4, #ffd1ff)',
    'linear-gradient(135deg, #ffecd2, #fcb69f)',
    'linear-gradient(135deg, #ff9a9e, #a18cd1)',
    'linear-gradient(135deg, #fbc2eb, #a6c1ee)',
    'linear-gradient(135deg, #84fab0, #8fd3f4)',
    'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
    'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #30cfd0, #330867)',
    'linear-gradient(135deg, #c471f5, #fa71cd)',
    'linear-gradient(135deg, #0ba360, #3cba92)',
    'linear-gradient(135deg, #00c6fb, #005bea)',
    'linear-gradient(135deg, #96fbc4, #f9f586)',
    'linear-gradient(135deg, #20E2D7, #F9FEA5)',
    'linear-gradient(135deg, #cd9cf2, #f6f3ff)',
    'linear-gradient(135deg, #fdfbfb, #ebedee)',
];

interface ColorSelectionPopoverProps {
    id?: string;
    selectedColor: string | null;
    onSelect: (color: string) => void;
    showManageLink?: boolean;
    onClose?: () => void;
    trigger?: React.ReactNode;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
}

export function ColorSelectionPopover({ id = 'color-picker', selectedColor, onSelect, showManageLink = false, onClose, trigger, side = "bottom", align = "start" }: ColorSelectionPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {trigger ? (
                    <div onClick={() => setIsOpen(true)}>{trigger}</div>
                ) : (
                    <button
                        type="button"
                        className={cn(
                            "h-10 w-10 rounded-full shadow-sm ring-1 ring-border shrink-0 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            !selectedColor && "bg-muted"
                        )}
                        style={{ background: selectedColor || '#e2e8f0' }}
                        title="Select Color"
                        onClick={() => setIsOpen(true)}
                    />
                )}
            </PopoverTrigger>
            <PopoverContent
                className="w-[320px] p-4 overflow-y-auto"
                align={align}
                side={side}
                collisionPadding={16}
                style={{ maxHeight: 'var(--radix-popover-content-available-height)' }}
            >
                <ColorSelectionContent
                    selectedColor={selectedColor}
                    onSelect={(c) => {
                        onSelect(c);
                        setIsOpen(false);
                    }}
                    showManageLink={showManageLink}
                    onClose={() => setIsOpen(false)}
                />
            </PopoverContent>
        </Popover>
    );
}
