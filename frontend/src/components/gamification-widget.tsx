'use client';

import { DashboardWidget } from "./dashboard-widget";
import { Flame, Medal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

export function GamificationWidget() {
    const { token } = useAuthStore();

    const fetchStatus = async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/gamification/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch gamification status');
        return res.json();
    }

    const { data, isLoading } = useQuery({
        queryKey: ['gamification-status'],
        queryFn: fetchStatus,
        refetchInterval: 60000 // Refresh every minute
    });

    if (isLoading) {
        return (
            <DashboardWidget title="Achievements">
                <div className="flex gap-4 items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                </div>
            </DashboardWidget>
        )
    }

    const streak = data?.streak || 0;

    return (
        <DashboardWidget
            title="Your Progress"
            className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-100 dark:border-orange-800"
            action={<Medal className="w-5 h-5 text-orange-500" />}
        >
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center bg-white dark:bg-card p-2 rounded-lg shadow-sm border border-border">
                    <Flame className={`w-8 h-8 ${streak > 0 ? 'text-orange-500 animate-pulse' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-bold mt-1 text-orange-600 dark:text-orange-400">{streak} Day{streak !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium">Daily Streak!</p>
                    <p className="text-xs text-muted-foreground">Log in daily to keep the fire burning.</p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">My Badges</p>
                <div className="flex gap-2 flex-wrap">
                    {data?.badges && data.badges.length > 0 ? (
                        data.badges.map((ub: any) => (
                            <div key={ub.id} className="group relative">
                                <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center border border-yellow-200 dark:border-yellow-800" title={ub.badge.name}>
                                    <span className="text-xs" role="img" aria-label={ub.badge.name}>
                                        {ub.badge.icon === 'Flame' ? '🔥' :
                                            ub.badge.icon === 'Sunrise' ? '🌅' :
                                                ub.badge.icon === 'Scale' ? '⚖️' :
                                                    ub.badge.icon === 'Footprints' ? '👣' : '🏆'}
                                    </span>
                                </div>
                                {/* Simple Tooltip via Tailwind group-hover - Optional Polish */}
                            </div>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground italic">No badges yet. Keep going!</span>
                    )}
                </div>
            </div>
        </DashboardWidget>
    );
}
