'use client';

import { DashboardWidget } from "./dashboard-widget";
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/language-context";
import { formatCurrency } from "@/lib/utils";

export function ComparativeReportWidget() {
    const { token } = useAuthStore();
    const { t, locale } = useLanguage();

    const fetchComparison = async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/dashboard/comparison`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(t('comparative.errors.fetch'));
        return res.json();
    }

    const { data, isLoading } = useQuery({
        queryKey: ['dashboard-comparison'],
        queryFn: fetchComparison
    });

    if (isLoading) {
        return (
            <DashboardWidget title={t('comparative.loadingTitle')}>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </DashboardWidget>
        )
    }

    if (!data) return null;

    const { currentMonthSpent, lastMonthSpent, percentageChange } = data;
    const isGood = percentageChange < 0; // Spending less is usually good

    return (
        <DashboardWidget
            title={t('comparative.title')}
            className={isGood ? "border-none bg-emerald-500/10" : "border-none bg-rose-500/10"}
            action={<TrendingUp className={`w-4 h-4 ${isGood ? 'text-emerald-500' : 'text-rose-500'}`} />}
        >
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">
                        {Math.abs(percentageChange).toFixed(1)}%
                    </span>
                    {isGood ? (
                        <ArrowDownRight className="w-5 h-5 text-green-600" />
                    ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-600" />
                    )}
                </div>
                <p className="text-sm text-foreground/80">
                    {isGood ? t('comparative.less') : t('comparative.more')}
                </p>
                <div className="flex justify-between text-xs text-muted-foreground mt-2 border-t pt-2 border-dashed border-gray-300 dark:border-gray-700">
                    <span>{t('comparative.currentLabel')}: {formatCurrency(currentMonthSpent, locale, 'BRL')}</span>
                    <span>{t('comparative.lastLabel')}: {formatCurrency(lastMonthSpent, locale, 'BRL')}</span>
                </div>
            </div>
        </DashboardWidget>
    );
}
