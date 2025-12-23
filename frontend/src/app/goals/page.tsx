'use client';

import { Navbar } from '@/components/navbar';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { goalsService } from '@/services/goals.service';
import { useAuthStore } from '@/store/auth-store';

export default function GoalsPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { token } = useAuthStore();

    const { data: goals, isLoading } = useQuery({
        queryKey: ['goals'],
        queryFn: goalsService.getAll,
        enabled: !!token,
    });

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">{t('common.loading')}</div>;
    }

    return (
        <div className="min-h-screen bg-background pb-10">
            <Navbar />
            <div className="container mx-auto p-4 md:p-8 space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gradient">Metas Financeiras</h1>
                        <p className="text-muted-foreground">Visualize seu futuro e acompanhe seu progresso.</p>
                    </div>
                    <Button onClick={() => router.push('/goals/new')} className="shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" /> Nova Meta
                    </Button>
                </div>

                {/* Emergency Fund Check */}
                <div className="glass-card p-6 rounded-xl border-l-4 border-l-emerald-500 bg-emerald-500/5">
                    <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                🛡️ Reserva de Emergência
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-xl">
                                Sua segurança financeira é prioridade. Recomendamos ter de 3 a 6 meses de gastos essenciais guardados.
                            </p>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="text-right">
                                <span className="block text-xl font-bold text-emerald-600 dark:text-emerald-400">R$ 15.000</span>
                                <span className="text-xs text-muted-foreground">de R$ 20.000</span>
                            </div>
                            <Button variant="outline" className="border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                                Adicionar
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals?.map((goal) => {
                        return (
                            <div key={goal.id} className="glass-card p-6 rounded-xl flex flex-col justify-between hover:shadow-lg transition-all space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                                        {goal.icon || "🎯"}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div>
                                    <h3 className="font-bold text-lg">{goal.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        R$ {goal.currentAmount.toLocaleString()} de R$ {goal.targetAmount.toLocaleString()}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                            style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{((goal.currentAmount / goal.targetAmount) * 100).toFixed(0)}% concluído</span>
                                        <span>Faltam R$ {(goal.targetAmount - goal.currentAmount).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    <button onClick={() => router.push('/goals/new')} className="group border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary min-h-[200px]">
                        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="h-6 w-6" />
                        </div>
                        <span className="font-medium">Criar nova meta</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
