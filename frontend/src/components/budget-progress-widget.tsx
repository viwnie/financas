'use client';

import { DashboardWidget } from "./dashboard-widget";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { formatCurrency } from "@/lib/utils";

export function BudgetProgressWidget() {
    const { token } = useAuthStore();
    const { t, locale } = useLanguage();

    const fetchBudgetStatus = async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/budgets/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(t('budgets.errors.fetchStatus'));
        return res.json();
    }

    const { data: budgets, isLoading } = useQuery({
        queryKey: ['budgets-status'],
        queryFn: fetchBudgetStatus,
    });

    if (isLoading) {
        return (
            <DashboardWidget title={t('budgets.statusTitle')}>
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </DashboardWidget>
        )
    }

    if (!budgets || budgets.length === 0) {
        return (
            <DashboardWidget title={t('budgets.statusTitle')}>
                <div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
                    <p>{t('budgets.emptyTitle')}</p>
                    <p className="text-xs">{t('budgets.emptyDescription')}</p>
                </div>
            </DashboardWidget>
        )
    }

    return (
        <DashboardWidget title={t('budgets.statusTitle')} className="h-[300px] overflow-y-auto">
            <div className="space-y-4">
                {budgets.map((item: any) => (
                    <div key={item.budget.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">{item.budget.category?.name || t('common.uncategorized')}</span>
                            <span className={
                                item.color === 'RED' ? 'text-red-500 font-bold' :
                                    item.color === 'YELLOW' ? 'text-yellow-500 font-bold' :
                                        'text-green-500'
                            }>
                                {item.percentage.toFixed(0)}%
                            </span>
                        </div>
                        <Progress
                            value={Math.min(item.percentage, 100)}
                            className={`h-2`}
                        // Note: Shadcn Progress usually takes a generic 'className', but controlling color internally might require custom CSS or props
                        // For now, we rely on the indicator style or custom implementation. 
                        // Since default Shadcn progress is monolithic, we might need a custom color prop or style.
                        // Let's assume standard behavior and just color the indicator if supported, or wrapped div.
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatCurrency(item.totalSpent, locale, 'BRL')}</span>
                            <span>{t('budgets.limitLabel')}: {formatCurrency(item.limit, locale, 'BRL')}</span>
                        </div>
                    </div>
                ))}
            </div>
        </DashboardWidget>
    );
}
