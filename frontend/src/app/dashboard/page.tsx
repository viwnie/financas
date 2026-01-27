'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/contexts/language-context';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { dashboardService } from '@/services/dashboard.service';
import { Landmark, TrendingUp, ArrowUpRight, ArrowDownRight, ChartLine, Wallet } from 'lucide-react';

const localeMap: Record<string, string> = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
};

function StatCard({
    label,
    value,
    helper,
    icon,
}: {
    label: string;
    value: string;
    helper: string;
    icon?: ReactNode;
}) {
    return (
        <Card className="app-card border-none bg-background/60">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    <span>{label}</span>
                    {icon}
                </div>
                <div className="text-2xl font-semibold text-foreground">{value}</div>
                <p className="text-xs text-muted-foreground">{helper}</p>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const { user, token } = useAuthStore();
    const { t, locale } = useLanguage();
    const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
    const [projectionYear, setProjectionYear] = useState(String(new Date().getFullYear() + 1));

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: dashboardService.getStats,
        enabled: !!token,
    });

    const monthOptions = useMemo(() => {
        const localeLabel = localeMap[locale] || 'pt-BR';
        return Array.from({ length: 12 }, (_, index) => {
            const label = new Date(2024, index).toLocaleString(localeLabel, { month: 'long' });
            return { value: String(index + 1), label: label.charAt(0).toUpperCase() + label.slice(1) };
        });
    }, [locale]);

    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, index) => String(currentYear - 1 + index));
    }, []);

    const entries = stats?.income.total ?? 0;
    const exits = stats?.expense.total ?? 0;
    const balance = stats?.balance.total ?? 0;

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">{t('common.loading')}</div>;
    }

    return (
        <AppShell>
            <section className="space-y-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <span className="app-chip">Dashboard</span>
                        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                            Olá, {user?.name}
                        </h1>
                        <p className="text-muted-foreground">Bem vindo a sua gestão financeira.</p>
                    </div>
                    <div className="flex gap-3">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[160px] rounded-full bg-background/60">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map((month) => (
                                    <SelectItem key={month.value} value={month.value}>
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[120px] rounded-full bg-background/60">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map((year) => (
                                    <SelectItem key={year} value={year}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Card className="app-card border-none bg-gradient-to-br from-primary/10 via-emerald-500/5 to-transparent">
                    <CardContent className="p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                <Landmark className="h-4 w-4 text-primary" />
                                Open Finance
                            </div>
                            <h2 className="text-xl font-semibold text-foreground">Conecte seu banco automaticamente</h2>
                            <p className="text-sm text-muted-foreground max-w-xl">
                                Importe suas transações bancárias de forma segura via Open Finance Brasil.
                            </p>
                        </div>
                        <Button className="rounded-full bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground shadow-[0_0_24px_rgba(16,185,129,0.35)]">
                            Conectar Banco
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard
                        label="Entradas"
                        value={formatCurrency(entries, locale, 'BRL')}
                        helper="Receitas do mês"
                        icon={<ArrowUpRight className="h-4 w-4 text-emerald-500" />}
                    />
                    <StatCard
                        label="Saídas"
                        value={formatCurrency(exits, locale, 'BRL')}
                        helper="Despesas do mês"
                        icon={<ArrowDownRight className="h-4 w-4 text-rose-500" />}
                    />
                    <StatCard
                        label="Saldo em Conta"
                        value={formatCurrency(balance, locale, 'BRL')}
                        helper="Disponível (projeção)"
                        icon={<Wallet className="h-4 w-4 text-primary" />}
                    />
                    <StatCard
                        label="Investimentos"
                        value={formatCurrency(0, locale, 'BRL')}
                        helper="Total investido (projeção)"
                        icon={<TrendingUp className="h-4 w-4 text-primary" />}
                    />
                    <StatCard
                        label="Transferências"
                        value={formatCurrency(0, locale, 'BRL')}
                        helper="Entre contas"
                        icon={<ChartLine className="h-4 w-4 text-primary" />}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="app-card border-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Resultado</CardTitle>
                            <p className="text-xs text-muted-foreground">Fluxo do mês</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-2xl font-semibold text-foreground">{formatCurrency(balance, locale, 'BRL')}</div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center justify-between">
                                    <span>Entradas</span>
                                    <span className="text-foreground">{formatCurrency(entries, locale, 'BRL')}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Saídas</span>
                                    <span className="text-foreground">{formatCurrency(exits, locale, 'BRL')}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="app-card border-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Faturas do Mês</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                            <p className="text-sm text-muted-foreground">
                                Nenhuma fatura ou despesa recorrente!
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                                Adicione despesas recorrentes ou conecte o Pluggy.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="app-card border-none">
                    <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle className="text-base">Fluxo de Caixa</CardTitle>
                            <p className="text-xs text-muted-foreground">Projeção para o próximo ano</p>
                        </div>
                        <Select value={projectionYear} onValueChange={setProjectionYear}>
                            <SelectTrigger className="w-[160px] rounded-full bg-background/60">
                                <SelectValue placeholder="Próximo ano" />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map((year) => (
                                    <SelectItem key={year} value={year}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-2xl border border-dashed border-border/70 bg-background/40 px-4 py-6 text-center text-sm text-muted-foreground">
                            Projeção baseada em lançamentos planejados e faturas futuras
                            <br />
                            Nenhum dado encontrado para o período selecionado.
                        </div>
                        <Button variant="outline" className="rounded-full">
                            Adicionar lançamentos futuros
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="app-card border-none lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">Meus Investimentos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <p>Nenhum investimento encontrado.</p>
                            <p>Conecte uma conta de corretora ou banco para ver seus investimentos.</p>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6">
                        <Card className="app-card border-none">
                            <CardHeader>
                                <CardTitle className="text-base">Meus Cartões</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-muted-foreground">
                                <p>Nenhum cartão cadastrado</p>
                                <p>Cadastre seus cartões para acompanhar gastos e faturas.</p>
                                <Button variant="outline" className="rounded-full">Cadastrar Cartão</Button>
                            </CardContent>
                        </Card>

                        <Card className="app-card border-none">
                            <CardHeader>
                                <CardTitle className="text-base">Maiores Gastos</CardTitle>
                                <p className="text-xs text-muted-foreground">Mês Atual</p>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-muted-foreground">
                                <p>Nenhum gasto registrado</p>
                                <p>Seus gastos do mês aparecerão aqui assim que você adicionar transações.</p>
                                <Button className="rounded-full bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground shadow-[0_0_24px_rgba(16,185,129,0.35)]">
                                    Adicionar Transação
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}
