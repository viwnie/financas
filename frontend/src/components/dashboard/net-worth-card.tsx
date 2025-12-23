"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, Wallet, TrendingUp } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { useAuthStore } from "@/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

export function NetWorthCard() {
    const { token } = useAuthStore();

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: dashboardService.getStats,
        enabled: !!token,
    });

    if (isLoading) {
        return <Skeleton className="h-32 w-full rounded-xl" />
    }

    const netWorth = stats?.balance.total || 0;
    // Assuming we might get monthly change from API later, for now we can calculate or hide it.
    // Ideally update dashboardService to return this if not already.
    // The current dashboardService.getStats returns balance.total.
    const monthlyChange = 0; // Placeholder until backend specific endpoint
    const percentageChange = 0; // Placeholder

    return (
        <Card className="glass border-0 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    Patrimônio Líquido
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                </div>
            </CardHeader>
            <CardContent className="z-10 relative">
                <div className="text-4xl font-bold tracking-tight text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netWorth)}
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <span className="text-emerald-500 flex items-center font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        {percentageChange}%
                    </span>
                    <span className="opacity-80">
                        + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyChange)} este mês
                    </span>
                </p>
            </CardContent>
        </Card>
    );
}
