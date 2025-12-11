'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Navbar } from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Category {
    id: string;
    isSystem: boolean;
    userId: string | null;
    name: string;
    color: string | null;
    translations: { language: string; name: string }[];
}

// Internal component to handle color debounce

function CategoryColorPicker({ id, initialColor, onUpdate }: { id: string, initialColor: string | null, onUpdate: (id: string, color: string) => void }) {
    const [color, setColor] = useState(initialColor || '#e2e8f0');

    // Debounce the update
    useEffect(() => {
        const timer = setTimeout(() => {
            if (color !== (initialColor || '#e2e8f0')) {
                onUpdate(id, color);
            }
        }, 500); // 500ms delay

        return () => clearTimeout(timer);
    }, [color, id, initialColor, onUpdate]);

    return (
        <div className="space-y-2">
            <Label htmlFor={`color-${id}`}>Category Color</Label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Input
                        id={`color-${id}`}
                        type="color"
                        className="h-10 w-full p-1 cursor-pointer"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                    />
                </div>
                <Input
                    value={color}
                    placeholder="#HEX"
                    className="w-24 uppercase"
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('#') && val.length === 7) {
                            setColor(val);
                        } else {
                            // Allow typing but don't update if invalid yet, or handle partials?
                            // For simplicity, just let it update local state if it looks vaguely like a color or handle it strictly
                            // Better to let them type freely but only commit valid hex
                            // For now, let's just stick to the specific hex format for the state or it might break the color input
                            if (val.length <= 7) setColor(val);
                        }
                    }}
                />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
                Click the color box to pick a new color.
            </p>
        </div>
    );
}

export default function CategoriesPage() {
    const { token } = useAuthStore();
    const { locale } = useLanguage();
    const queryClient = useQueryClient();

    const { data: categories = [], isLoading } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/categories`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch categories');
            return res.json();
        },
        enabled: !!token,
    });

    const updateColorMutation = useMutation({
        mutationFn: async ({ id, color }: { id: string; color: string }) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/categories/${id}/color`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ color })
            });
            if (!res.ok) throw new Error('Failed to update color');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Category color updated');
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
        onError: () => {
            toast.error('Failed to update color');
        }
    });

    const handleColorChange = (id: string, color: string) => {
        updateColorMutation.mutate({ id, color });
    };

    const getCategoryDisplayName = (category: Category) => {
        if (category.translations && category.translations.length > 0) {
            // Try exact match first (e.g. 'pt-BR' or 'pt')
            const exact = category.translations.find((t: any) => t.language === locale);
            if (exact) return exact.name;

            // Try language group (e.g. 'pt' matching 'pt-BR')
            const group = category.translations.find((t: any) => t.language.startsWith(locale.split('-')[0]));
            if (group) return group.name;

            // Fallback
            return category.translations[0].name;
        }
        return category.name;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-8">
            <Navbar />
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold">Category Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Customize how your categories appear in transactions and reports.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((category) => (
                        <Card key={category.id} className="overflow-hidden">
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-center">
                                    <div
                                        className="h-8 w-8 rounded-full border shadow-sm"
                                        style={{ backgroundColor: category.color || '#e2e8f0' }}
                                    />
                                    {category.isSystem && (
                                        <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">System</span>
                                    )}
                                </div>
                                <CardTitle className="mt-2 text-xl truncate" title={category.name}>
                                    {getCategoryDisplayName(category)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CategoryColorPicker
                                    id={category.id}
                                    initialColor={category.color}
                                    onUpdate={handleColorChange}
                                />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
