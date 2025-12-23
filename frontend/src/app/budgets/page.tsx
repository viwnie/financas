'use client';

import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { budgetsService } from '@/services/budgets.service';
import { useAuthStore } from '@/store/auth-store';

export default function BudgetsPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { token } = useAuthStore();

    const { data: budgets, isLoading } = useQuery({
        queryKey: ['budgets'],
        queryFn: budgetsService.getAll,
        enabled: !!token,
    });

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">{t('common.loading')}</div>;
    }

    return (
        <div className="min-h-screen bg-background transition-colors duration-300 pb-10">
            <Navbar />
            <div className="p-8 space-y-8 max-w-5xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gradient">Orçamentos</h1>
                        <p className="text-muted-foreground">Defina limites e controle seus gastos por categoria.</p>
                    </div>
                    <Button onClick={() => router.push('/budgets/new')} className="gap-2 shadow-lg shadow-primary/20">
                        <Plus className="w-4 h-4" /> Novo Orçamento
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {budgets.map((budget) => {
                        const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
                        const isOverBudget = budget.spent > budget.limit;

                        return (
                            <div key={budget.id} className="glass-card p-6 rounded-xl space-y-4 hover:scale-[1.02] transition-transform">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${budget.category?.userSettings?.[0]?.color || 'bg-gray-500'}`} />
                                        <h3 className="font-semibold">{budget.category?.translations?.[0]?.name || budget.category?.name || 'Uncategorized'}</h3>
                                    </div>
                                    {isOverBudget && (
                                        <span className="text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            Alerta
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Gasto: <span className="text-foreground font-medium">R$ {budget.spent}</span></span>
                                        <span className="text-muted-foreground">Limite: R$ {budget.limit}</span>
                                    </div>
                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-primary'}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-right text-muted-foreground">
                                        {percentage.toFixed(0)}% utilizado
                                    </p>
                                </div>
                            </div>
                        )
                    })}

                    {/* Add New Card Stub */}
                    <button onClick={() => router.push('/budgets/new')} className="group border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary min-h-[160px]">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="h-5 w-5" />
                        </div>
                        <span className="font-medium">Criar limite</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
