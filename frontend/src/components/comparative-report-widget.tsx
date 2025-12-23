'use client';

import { DashboardWidget } from "./dashboard-widget";
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

export function ComparativeReportWidget() {
    const { token } = useAuthStore();

    const fetchComparison = async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/dashboard/comparison`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch comparison');
        return res.json();
    }

    const { data, isLoading } = useQuery({
        queryKey: ['dashboard-comparison'],
        queryFn: fetchComparison
    });

    if (isLoading) {
        return (
            <DashboardWidget title="Monthly vs Last">
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
            title="Monthly Comparison"
            className={isGood ? "bg-green-50 dark:bg-green-950/20 border-green-200" : "bg-red-50 dark:bg-red-950/20 border-red-200"}
            action={<TrendingUp className={`w-4 h-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />}
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
                    {isGood ? "less" : "more"} spent compared to last month.
                </p>
                <div className="flex justify-between text-xs text-muted-foreground mt-2 border-t pt-2 border-dashed border-gray-300 dark:border-gray-700">
                    <span>Current: ${currentMonthSpent.toFixed(0)}</span>
                    <span>Last: ${lastMonthSpent.toFixed(0)}</span>
                </div>
            </div>
        </DashboardWidget>
    );
}
