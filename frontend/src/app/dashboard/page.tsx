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

export default function DashboardPage() {
    const { user, token } = useAuthStore();
    const router = useRouter();
    const { t } = useLanguage();

    if (!user) {
        // Middleware handles this
    }

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const res = await fetch('http://localhost:3000/dashboard/stats', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        enabled: !!token,
    });

    const { data: evolution, isLoading: evolutionLoading } = useQuery({
        queryKey: ['dashboard-evolution'],
        queryFn: async () => {
            const res = await fetch('http://localhost:3000/dashboard/evolution', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch evolution');
            return res.json();
        },
        enabled: !!token,
    });

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    if (statsLoading || evolutionLoading) {
        return <div className="flex items-center justify-center h-screen">{t('common.loading')}</div>;
    }

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            <Navbar />
            <div className="p-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">{t('dashboard.welcome')}, {user?.name}</h1>
                        <p className="text-muted-foreground">Here's your financial overview.</p>
                    </div>
                </div>

                {/* Navigation Cards - Optional now with Navbar, but good for quick access */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="secondary" className="h-24 text-lg gap-2" onClick={() => router.push('/transactions')}>
                        <CreditCard className="h-6 w-6" /> {t('dashboard.transactions')}
                    </Button>
                    <Button variant="secondary" className="h-24 text-lg gap-2" onClick={() => router.push('/friends')}>
                        <Users className="h-6 w-6" /> {t('dashboard.friends')}
                    </Button>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('dashboard.totalIncome')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-500">+${stats.totalIncome.toFixed(2)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('dashboard.totalExpense')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-500">-${stats.totalExpense.toFixed(2)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('dashboard.balance')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    ${stats.balance.toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Charts */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>{t('dashboard.evolution')}</CardTitle>
                            <CardDescription>Income vs Expenses over the last 6 months</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <div className="h-[300px] w-full">
                                {evolution && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={evolution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                                                itemStyle={{ color: 'var(--foreground)' }}
                                            />
                                            <Area type="monotone" dataKey="income" stroke="#22c55e" fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                                            <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" name="Expense" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>{t('dashboard.expensesByCategory')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                {stats && stats.categoryStats.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.categoryStats}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="amount"
                                                nameKey="category"
                                            >
                                                {stats.categoryStats.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number) => `$${value.toFixed(2)}`}
                                                contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
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
