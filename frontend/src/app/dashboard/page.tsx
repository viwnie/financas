'use client';

import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useLanguage } from '@/contexts/language-context';
import { Navbar } from '@/components/navbar';
import { CreditCard, Users, Mail } from 'lucide-react';
import { getCategoryDisplayName } from '@/lib/utils';
import { PrivacyBlur } from '@/components/privacy-blur';
import { DashboardWidget } from '@/components/dashboard-widget';
import { OneTapEntryWidget } from '@/components/one-tap-widget';
import { GamificationHub } from '@/components/gamification/gamification-hub';
import { ComparativeReportWidget } from '@/components/comparative-report-widget';

// New Dashboard Components
import { NetWorthCard } from '@/components/dashboard/net-worth-card';
import { SavingsGoalProgress } from '@/components/dashboard/savings-goal-progress';
import { InsightsFeed } from '@/components/dashboard/insights-feed';
import { dashboardService } from '@/services/dashboard.service';

export default function DashboardPage() {
    const { user, token } = useAuthStore();
    const router = useRouter();
    const { t, locale } = useLanguage();

    if (!user) {
        // Middleware handles this
    }

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: dashboardService.getStats,
        enabled: !!token,
    });

    const { data: evolution, isLoading: evolutionLoading } = useQuery({
        queryKey: ['dashboard-evolution'],
        queryFn: dashboardService.getEvolution,
        enabled: !!token,
    });

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    if (statsLoading || evolutionLoading) {
        return <div className="flex items-center justify-center h-screen">{t('common.loading')}</div>;
    }

    return (
        <div className="min-h-screen bg-background transition-colors duration-300 pb-10">
            <Navbar />
            <div className="container mx-auto p-4 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gradient">{t('dashboard.welcome')}, {user?.name}</h1>
                        <p className="text-muted-foreground">Sua saúde financeira em um só lugar.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.push('/transactions')}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            {t('dashboard.transactions')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/friends')}>
                            <Users className="h-4 w-4 mr-2" />
                            {t('dashboard.friends')}
                        </Button>
                    </div>
                </div>

                {/* Section 1: Financial Health & Wellness (The "Why") */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <NetWorthCard />

                        {/* Stats Widgets Inline */}
                        {stats && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <DashboardWidget title={t('dashboard.totalIncome')} className="glass-card">
                                    <div className="text-2xl font-bold text-emerald-500">
                                        <PrivacyBlur>+${stats.income.total.toFixed(2)}</PrivacyBlur>
                                    </div>
                                </DashboardWidget>

                                <DashboardWidget title={t('dashboard.totalExpense')} className="glass-card">
                                    <div className="text-2xl font-bold text-red-500">
                                        <PrivacyBlur>-${stats.expense.total.toFixed(2)}</PrivacyBlur>
                                    </div>
                                </DashboardWidget>

                                <DashboardWidget title={t('dashboard.balance')} className="glass-card">
                                    <div className={`text-2xl font-bold ${stats.balance.total >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        <PrivacyBlur>${stats.balance.total.toFixed(2)}</PrivacyBlur>
                                    </div>
                                </DashboardWidget>
                            </div>
                        )}
                    </div>
                    <ComparativeReportWidget />
                </div>

                {/* Section 2: Three Column Widgets */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <SavingsGoalProgress />
                    <GamificationHub />
                    <InsightsFeed />
                </div>

                {/* Section 3: Action & Deep Dive */}
                <div className="md:hidden">
                    <OneTapEntryWidget />
                </div>

                {/* Charts Section */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 max-w-full">
                    <Card className="col-span-4 glass-card border-none overflow-hidden">
                        <CardHeader>
                            <CardTitle>{t('dashboard.evolution')}</CardTitle>
                            <CardDescription>Fluxo de caixa dos últimos 6 meses</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <div className="h-[300px] w-full min-w-0">
                                {evolution && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={evolution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius)' }}
                                                itemStyle={{ color: 'var(--foreground)' }}
                                            />
                                            <Area type="monotone" dataKey="income" stroke="var(--chart-1)" fillOpacity={1} fill="url(#colorIncome)" name="Receita" />
                                            <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" name="Despesa" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-3 glass-card border-none">
                        <CardHeader>
                            <CardTitle>{t('dashboard.expensesByCategory')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                {stats && stats.expensesByCategory.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.expensesByCategory.map((item: any) => ({
                                                    ...item,
                                                    displayName: getCategoryDisplayName(item, locale)
                                                }))}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="amount"
                                                nameKey="displayName"
                                            >
                                                {stats.expensesByCategory.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number) => `$${value.toFixed(2)}`}
                                                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius)' }}
                                                itemStyle={{ color: 'var(--foreground)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        {t('dashboard.noExpenses')}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
