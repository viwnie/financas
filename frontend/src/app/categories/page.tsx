'use client';


import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Loader2, Plus, ChevronDown, Lock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/contexts/language-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Navbar } from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ColorSelectionPopover } from '@/components/ui/color-selection-popover';
import { ColorSelectionContent } from '@/components/ui/color-selection-content';

interface Category {
    id: string;
    isSystem: boolean;
    userId: string | null;
    name: string;
    color: string | null;
    translations: { language: string; name: string }[];
}

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PRESET_GRADIENTS } from '@/components/ui/color-selection-content';

interface SortableColorItemProps {
    color: string;
    onDelete: (color: string) => void;
    isSystem: boolean;
}

function SortableColorItem({ color, onDelete, isSystem }: SortableColorItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: color });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group relative touch-none">
            <div
                className="h-10 w-10 rounded-full shadow-sm ring-1 ring-border cursor-move flex items-center justify-center"
                style={{ background: color }}
                title={isSystem ? "System color (cannot delete) - Drag to reorder" : "Custom color - Drag to reorder"}
            >
                {isSystem && (
                    <Lock className="h-4 w-4 text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
            </div>
            {!isSystem && (
                <button
                    className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md cursor-pointer pointer-events-auto"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(color);
                    }}
                    title="Delete color"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}

interface ColorManagementSectionProps {
    token: string | null;
    queryClient: any;
}

function ColorManagementSection({ token, queryClient }: ColorManagementSectionProps) {
    const [items, setItems] = useState<string[]>([]);

    // Fetch user saved colors
    const { data: savedColors = [], isSuccess } = useQuery({
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

    // Initialize/Sync items when query succeeds
    useEffect(() => {
        if (isSuccess) {
            // Logic: 
            // 1. If user has NO saved colors at all (empty array from DB), we assume first load.
            //    We merge PRESET_GRADIENTS + empty. 
            // 2. If user HAS saved colors, we check if they contain the system colors.
            //    To support the "user can reorder everything" req, we must treat the DB list as the master list.
            //    BUT if the DB list is just "custom colors" (old behavior), it won't have system colors.
            //    So we fallback: If the DB list doesn't overlap significantly with system colors, we likely need to merge them.
            //    Simplest approach: If DB list is empty, use presets. If DB list is present, use it.
            //    However, to migrating old users who have 0 saved colors, we want them to see system colors.
            //    What if they deleted everything? We should probably allow restoring defaults? 
            //    Let's assume: If savedColors is empty, use PRESET_GRADIENTS.
            //    Wait, what if they just have 1 custom color? Then we lose system colors?
            //    Better: Merge unique(savedColors + PRESET_GRADIENTS). 
            //    But order matters. If savedColors has data, we trust its order.
            //    If savedColors is missing system colors that *should* be there, we append them?
            //    Let's try: If savedColors is empty, init with PRESET_GRADIENTS.

            if (savedColors.length === 0) {
                setItems(PRESET_GRADIENTS);
            } else {
                // Check if it contains system colors. 
                // If the user has saved colors but they are disjoint from presets (i.e. old data),
                // we might want to merge.
                const hasSystemColors = savedColors.some((c: string) => PRESET_GRADIENTS.includes(c));
                if (!hasSystemColors) {
                    // Old data only had custom colors. Prepend presets.
                    setItems([...PRESET_GRADIENTS, ...savedColors]);
                } else {
                    // Has system colors, so we trust the order from DB.
                    setItems(savedColors);
                }
            }
        }
    }, [savedColors, isSuccess]);

    const updateColorsMutation = useMutation({
        mutationFn: async (newColors: string[]) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/me/colors-list`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ colors: newColors })
            });
            if (!res.ok) throw new Error('Failed to update colors');
            return res.json();
        },
        onSuccess: () => {
            // success silently or small toast
        },
        onError: () => {
            toast.error('Failed to save color order');
        }
    });

    const deleteColorMutation = useMutation({
        mutationFn: async (color: string) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/me/colors/${encodeURIComponent(color)}`, {
                method: 'PATCH', // Using the endpoint we created
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete color');
            return res.json();
        },
        onSuccess: (updatedListFromBackend) => {
            toast.success('Color deleted');
            setItems(updatedListFromBackend); // Update local state from backend response
            queryClient.setQueryData(['saved-colors'], updatedListFromBackend);
        },
        onError: () => {
            toast.error('Failed to delete color');
        }
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                const newOrder = arrayMove(items, oldIndex, newIndex);

                // Trigger save
                updateColorsMutation.mutate(newOrder);

                return newOrder;
            });
        }
    };

    if (items.length === 0) {
        return <div className="text-muted-foreground text-sm">Loading colors...</div>;
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-wrap gap-3 p-1">
                <SortableContext items={items} strategy={rectSortingStrategy}>
                    {items.map((color) => (
                        <SortableColorItem
                            key={color}
                            color={color}
                            onDelete={(c) => deleteColorMutation.mutate(c)}
                            isSystem={PRESET_GRADIENTS.includes(color)}
                        />
                    ))}
                </SortableContext>
            </div>
        </DndContext>
    );
}

export default function CategoriesPage() {
    const { token } = useAuthStore();
    const { locale } = useLanguage();
    const queryClient = useQueryClient();
    const [expandedId, setExpandedId] = useState<string | null>(null);

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
            // Removed generic success toast to avoid spamming while dragging/picking colors
            // toast.success('Category color updated');
            // Instead, rely on the visual update which is already instant due to local mutation state or query invalidation
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
        onError: () => {
            toast.error('Failed to update color');
        }
    });

    const createCategoryMutation = useMutation({
        mutationFn: async (data: { name: string; color: string }) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to create category');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Category created successfully');
            queryClient.invalidateQueries({ queryKey: ['categories'] });

            setNewCategoryName('');
            setNewCategoryColor(null);
        },
        onError: () => {
            toast.error('Failed to create category');
        }
    });

    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/categories/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to delete category');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Category deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setCategoryToDelete(null);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const confirmDeleteCategory = () => {
        if (categoryToDelete) {
            deleteCategoryMutation.mutate(categoryToDelete);
        }
    };

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState<string | null>(null);

    const handleCreateCategory = () => {
        if (!newCategoryName.trim()) {
            toast.error('Category name is required');
            return;
        }
        createCategoryMutation.mutate({
            name: newCategoryName,
            color: newCategoryColor || '#e2e8f0'
        });
    };

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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    {/* Inline Creation Card */}
                    <Card className="border-dashed border-2 bg-muted/20 flex flex-col justify-center">
                        <CardHeader>
                            <CardTitle className="text-lg">Create New Category</CardTitle>
                            <CardDescription>Add a new category.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4 items-start">
                                    <div className="space-y-2">
                                        <Label>Color</Label>
                                        <div className="flex items-center gap-2">
                                            <ColorSelectionPopover
                                                selectedColor={newCategoryColor}
                                                onSelect={setNewCategoryColor}
                                                showManageLink={false}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g., Groceries"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleCreateCategory}
                                    disabled={createCategoryMutation.isPending}
                                    className="w-full"
                                >
                                    {createCategoryMutation.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="mr-2 h-4 w-4" />
                                    )}
                                    Create Category
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Color Management Section */}
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-lg">My Saved Colors</CardTitle>
                            <CardDescription>
                                Manage your custom colors. Drag and drop to reorder the palette.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ColorManagementSection token={token} queryClient={queryClient} />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {categories.map((category) => (
                        <Card
                            key={category.id}
                            className={cn(
                                "overflow-hidden transition-all duration-300 ease-in-out",
                                expandedId === category.id ? "ring-2 ring-primary shadow-md" : "hover:border-primary/50"
                            )}
                        >
                            <CardHeader
                                className="cursor-pointer select-none group"
                                onClick={() => setExpandedId(expandedId === category.id ? null : category.id)}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-8 w-8 rounded-full shadow-sm ring-1 ring-border"
                                            style={{ background: category.color || '#e2e8f0' }}
                                        />
                                        <CardTitle className="text-lg truncate group-hover:text-primary transition-colors" title={category.name}>
                                            {getCategoryDisplayName(category)}
                                        </CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ChevronDown
                                            className={cn(
                                                "h-5 w-5 text-muted-foreground transition-transform duration-300",
                                                expandedId === category.id && "rotate-180"
                                            )}
                                        />
                                        {!category.isSystem && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10 z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCategoryToDelete(category.id);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {category.isSystem && (
                                            <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">System</span>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <div
                                className={cn(
                                    "grid transition-[grid-template-rows] duration-300 ease-in-out border-t bg-muted/10",
                                    expandedId === category.id ? "grid-rows-[1fr]" : "grid-rows-[0fr] border-none"
                                )}
                            >
                                <div className="overflow-hidden">
                                    <CardContent className="pt-4">
                                        <ColorSelectionContent
                                            selectedColor={category.color}
                                            onSelect={(c) => handleColorChange(category.id, c)}
                                            showManageLink={false}
                                            onClose={() => setExpandedId(null)}
                                        />
                                    </CardContent>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <Dialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Category</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this category? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCategoryToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteCategory} disabled={deleteCategoryMutation.isPending}>
                            {deleteCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
