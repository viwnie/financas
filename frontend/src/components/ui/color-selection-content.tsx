import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { HexColorPicker } from "react-colorful";
import { Input } from '@/components/ui/input';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export interface ColorSelectionContentProps {
    selectedColor: string | null;
    onSelect: (color: string) => void;
    showManageLink?: boolean;
    onClose?: () => void;
}

export function ColorSelectionContent({ selectedColor, onSelect, showManageLink = false, onClose }: ColorSelectionContentProps) {
    const initialColor = selectedColor;
    const isGradient = initialColor?.includes('gradient');
    const { token } = useAuthStore();
    const queryClient = useQueryClient();

    const { data: savedColors = [] } = useQuery({
        queryKey: ['saved-colors'],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/me/colors`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!token
    });

    const saveColorMutation = useMutation({
        mutationFn: async (color: string) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/me/colors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ color })
            });
            if (!res.ok) throw new Error('Failed to save color');
            return res.json();
        },
        onSuccess: (newColors) => {
            queryClient.setQueryData(['saved-colors'], newColors);
            queryClient.invalidateQueries({ queryKey: ['saved-colors'] });
            toast.success('Color saved!');
        },
        onError: () => {
            toast.error('Failed to save color');
        }
    });

    const [color, setColor] = useState<string | null>(initialColor || null);
    const [customColor, setCustomColor] = useState(!isGradient && initialColor ? initialColor : '#000000');
    // Gradient state
    const [isGradientMode, setGradientMode] = useState(isGradient);
    const [gradientStart, setGradientStart] = useState('#EF4444');
    const [gradientEnd, setGradientEnd] = useState('#3B82F6');
    const [activeGradientStop, setActiveGradientStop] = useState<'start' | 'end'>('start');

    const [activeTab, setActiveTab] = useState("gradients");

    useEffect(() => {
        setColor(selectedColor || null);
        if (selectedColor) {
            if (selectedColor.includes('gradient')) {
                setGradientMode(true);
                const match = selectedColor.match(/linear-gradient\(135deg,\s*(.+?),\s*(.+?)\)/);
                if (match) {
                    setGradientStart(match[1]);
                    setGradientEnd(match[2]);
                }
            } else {
                setGradientMode(false);
                setCustomColor(selectedColor);
            }
        }
    }, [selectedColor]);

    const handlePresetClick = (val: string) => {
        setColor(val);
        onSelect(val);
        if (onClose) onClose();
    };

    const handleSaveColor = () => {
        const colorToSave = isGradientMode
            ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
            : customColor;

        saveColorMutation.mutate(colorToSave);
        setColor(colorToSave);
        onSelect(colorToSave);
        setActiveTab("gradients");
    };

    // If savedColors contains system colors, use it as the master list (preserves user order).
    // Otherwise, prepend presets (legacy behavior or first load with custom colors only).
    const hasSystemColors = savedColors.some((c: string) => PRESET_GRADIENTS.includes(c));
    const allColors = hasSystemColors ? savedColors : [...PRESET_GRADIENTS, ...savedColors];

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="gradients">Destaques</TabsTrigger>
                <TabsTrigger value="solids">Personalizar</TabsTrigger>
            </TabsList>
            <TabsContent value="gradients" className="mt-0">
                <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-1">
                    {allColors.map((c, index) => (
                        <button
                            key={index}
                            type="button"
                            className={cn(
                                "h-8 w-8 rounded-full shadow-sm ring-offset-background transition-all hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer",
                                color === c && "ring-2 ring-ring ring-offset-2 scale-110"
                            )}
                            style={{ background: c }}
                            onClick={() => handlePresetClick(c)}
                            title={c}
                        >
                            {color === c && (
                                <Check className="h-4 w-4 text-white drop-shadow-md mx-auto" />
                            )}
                        </button>
                    ))}
                </div>
                {showManageLink && (
                    <div className="mt-4 pt-4 border-t flex justify-end">
                        <Link href="/categories" passHref>
                            <Button variant="ghost" size="sm" className="w-full text-xs">
                                Gerenciar Categorias
                            </Button>
                        </Link>
                    </div>
                )}
            </TabsContent>
            <TabsContent value="solids" className="mt-0 space-y-4">
                <div className="space-y-4">
                    {/* Mode Toggle */}
                    <div className="flex p-1 bg-muted rounded-lg">
                        <button
                            type="button"
                            className={cn(
                                "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
                                !isGradientMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setGradientMode(false)}
                        >
                            Sólido
                        </button>
                        <button
                            type="button"
                            className={cn(
                                "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
                                isGradientMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setGradientMode(true)}
                        >
                            Gradiente
                        </button>
                    </div>

                    {!isGradientMode ? (
                        /* Solid Color UI */
                        <div className="space-y-3">
                            <div className="w-full flex justify-center [&_.react-colorful]:w-full [&_.react-colorful]:h-[100px]">
                                <HexColorPicker color={customColor} onChange={(c) => { setCustomColor(c); onSelect(c); }} />
                            </div>
                            <div className="flex items-center space-x-2 w-full">
                                <div className="h-8 w-8 rounded-full shadow-sm ring-1 ring-border shrink-0" style={{ background: customColor }} />
                                <div className="relative flex-1">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">#</span>
                                    <Input
                                        className="pl-5 uppercase font-mono h-8 text-sm"
                                        value={customColor.replace('#', '')}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (/^[0-9A-Fa-f]*$/.test(val)) {
                                                const hex = `#${val}`;
                                                setCustomColor(hex);
                                                if (val.length === 6) onSelect(hex);
                                            }
                                        }}
                                        maxLength={6}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Gradient UI */
                        <div className="space-y-3">
                            {/* Preview */}
                            <div
                                className="h-12 w-full rounded-md shadow-sm ring-1 ring-border"
                                style={{ background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` }}
                            />

                            {/* Color Pickers Selection */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className={cn(
                                        "flex-1 p-2 rounded-md border text-left space-y-1 hover:bg-muted/50 transition-colors",
                                        activeGradientStop === 'start' && "ring-2 ring-primary border-primary"
                                    )}
                                    onClick={() => setActiveGradientStop('start')}
                                >
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase">Início</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full border" style={{ background: gradientStart }} />
                                        <span className="text-xs font-mono">{gradientStart}</span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    className={cn(
                                        "flex-1 p-2 rounded-md border text-left space-y-1 hover:bg-muted/50 transition-colors",
                                        activeGradientStop === 'end' && "ring-2 ring-primary border-primary"
                                    )}
                                    onClick={() => setActiveGradientStop('end')}
                                >
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase">Fim</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full border" style={{ background: gradientEnd }} />
                                        <span className="text-xs font-mono">{gradientEnd}</span>
                                    </div>
                                </button>
                            </div>

                            {/* Main Picker */}
                            <div className="w-full flex justify-center [&_.react-colorful]:w-full [&_.react-colorful]:h-[100px]">
                                <HexColorPicker
                                    color={activeGradientStop === 'start' ? gradientStart : gradientEnd}
                                    onChange={(c) => {
                                        if (activeGradientStop === 'start') {
                                            setGradientStart(c);
                                            const newGradient = `linear-gradient(135deg, ${c}, ${gradientEnd})`;
                                            onSelect(newGradient);
                                        } else {
                                            setGradientEnd(c);
                                            const newGradient = `linear-gradient(135deg, ${gradientStart}, ${c})`;
                                            onSelect(newGradient);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <Button className="w-full" onClick={handleSaveColor}>
                        Salvar Cor
                    </Button>
                </div>
            </TabsContent>
        </Tabs>
    );
}
