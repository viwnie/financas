import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Plus, Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

const SOLID_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
    '#64748b', '#71717a', '#737373', '#78716c', '#000000',
];

interface ColorSelectionPopoverProps {
    id?: string;
    selectedColor: string | null;
    onSelect: (color: string) => void;
    showManageLink?: boolean;
    onClose?: () => void;
}

export function ColorSelectionPopover({ id = 'color-picker', selectedColor, onSelect, showManageLink = false, onClose }: ColorSelectionPopoverProps) {
    const initialColor = selectedColor; // Allow null
    const isGradient = initialColor?.includes('gradient');
    const [color, setColor] = useState<string | null>(initialColor || null);
    const [customColor, setCustomColor] = useState(!isGradient && initialColor ? initialColor : '#000000');
    // If it's a category page (no manage link), we might want to toggle custom picker
    const [isCustomOpen, setIsCustomOpen] = useState(false);

    useEffect(() => {
        setColor(selectedColor || null);
        if (selectedColor && !selectedColor.includes('gradient')) {
            setCustomColor(selectedColor);
        }
    }, [selectedColor]);

    const handlePresetClick = (gradient: string) => {
        setColor(gradient);
        onSelect(gradient);
        if (onClose) onClose();
    };

    const handleCustomChange = (val: string) => {
        setCustomColor(val);
        setColor(val);
        onSelect(val);
        // Do not close automatically on custom color change allowing refinement
    };

    const isCustomSelected = color !== null && !PRESET_GRADIENTS.includes(color);

    return (
        <div className="w-[240px]">
            <div className="grid grid-cols-6 gap-2">
                {PRESET_GRADIENTS.map((gradient, index) => (
                    <button
                        key={index}
                        type="button"
                        className={cn(
                            "h-7 w-7 rounded-full shadow-sm ring-offset-background transition-all hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer",
                            color === gradient && "ring-2 ring-ring ring-offset-2 scale-110"
                        )}
                        style={{ background: gradient }}
                        onClick={() => handlePresetClick(gradient)}
                        title={`Gradient ${index + 1}`}
                    >
                        {color === gradient && (
                            <Check className="h-3 w-3 text-white drop-shadow-md mx-auto" />
                        )}
                    </button>
                ))}

                {/* If selected color is custom, show it at the end */}
                {isCustomSelected && (
                    <button
                        type="button"
                        className={cn(
                            "h-7 w-7 rounded-full shadow-sm ring-offset-background transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer",
                            "ring-2 ring-ring ring-offset-2 scale-110" // Always selected if we are here
                        )}
                        style={{ background: color }}
                        onClick={() => { }} // No-op, just display
                        title="Custom Color"
                    >
                        <Check className="h-3 w-3 text-white drop-shadow-md mx-auto" />
                    </button>
                )}

                {showManageLink ? (
                    <Link href="/categories" passHref>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full border-dashed border-2 hover:border-solid bg-transparent"
                            title="Manage Categories"
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </Link>
                ) : (
                    // Toggle Custom Picker for Categories Page
                    <Button
                        variant={isCustomOpen ? "default" : "outline"}
                        size="icon"
                        className={cn("h-7 w-7 rounded-full", isCustomOpen ? "" : "border-dashed border-2")}
                        onClick={() => setIsCustomOpen(!isCustomOpen)}
                        title="Mix Custom Color"
                    >
                        {isCustomOpen ? <ChevronUp className="h-3 w-3" /> : <Palette className="h-3 w-3" />}
                    </Button>
                )}
            </div>

            {isCustomOpen && !showManageLink && (
                <div className="mt-4 pt-4 border-t space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-6 gap-2">
                        {SOLID_COLORS.map((solid, index) => (
                            <button
                                key={index}
                                type="button"
                                className={cn(
                                    "h-7 w-7 rounded-full shadow-sm ring-offset-background transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer",
                                    color === solid && "ring-2 ring-ring ring-offset-2 scale-110"
                                )}
                                style={{ background: solid }}
                                onClick={() => handleCustomChange(solid)}
                                title={solid}
                            >
                                {color === solid && (
                                    <Check className="h-3 w-3 text-white drop-shadow-md mx-auto" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`color-${id}`} className="text-xs">Hex Color</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id={`color-${id}`}
                                    type="color"
                                    className="h-8 w-full p-1 cursor-pointer"
                                    value={customColor}
                                    onChange={(e) => handleCustomChange(e.target.value)}
                                />
                            </div>
                            <Input
                                value={customColor}
                                placeholder="#HEX"
                                className="w-24 uppercase h-8 text-xs"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomColor(val);
                                    if (val.startsWith('#') && val.length === 7) {
                                        handleCustomChange(val);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
