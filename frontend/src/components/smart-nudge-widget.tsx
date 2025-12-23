'use client';

import { DashboardWidget } from "./dashboard-widget";
import { Lightbulb, AlertTriangle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNudgesService } from "@/lib/nudges.service";
import { Skeleton } from "@/components/ui/skeleton";

export function SmartNudgeWidget() {
    const { getActiveNudges } = useNudgesService();

    const { data: nudges, isLoading } = useQuery({
        queryKey: ['smart-nudges'],
        queryFn: getActiveNudges,
        retry: false
    });

    if (isLoading) {
        return (
            <DashboardWidget title="Smart Insight" className="min-h-[120px]">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </DashboardWidget>
        );
    }

    // Default state if no nudges
    if (!nudges || nudges.length === 0) {
        return (
            <DashboardWidget
                title="Smart Insight"
                className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800"
                action={<CheckCircle className="w-4 h-4 text-green-500" />}
            >
                <div className="space-y-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        All good!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                        You're within your budget limits for now. Keep it up!
                    </p>
                </div>
            </DashboardWidget>
        );
    }

    // Show the highest priority nudge (Critical > Warning)
    // For this iteration, we just show the first one. Future: Carousel.
    const activeNudge = nudges[0];
    const isCritical = activeNudge.severity === 'CRITICAL';
    const isWarning = activeNudge.severity === 'WARNING';

    let bgClass = "bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-200 dark:border-indigo-800";
    let icon = <Lightbulb className="w-4 h-4 text-indigo-500" />;

    if (isCritical) {
        bgClass = "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-800";
        icon = <AlertTriangle className="w-4 h-4 text-red-500" />;
    } else if (isWarning) {
        bgClass = "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800";
        icon = <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }

    return (
        <DashboardWidget
            title={activeNudge.title}
            className={bgClass}
            action={icon}
        >
            <div className="space-y-2">
                <p className="text-sm text-foreground/90 font-medium">
                    {activeNudge.message}
                </p>
                {/* Future: Add 'Action API' here, e.g. "View Budget" button */}
            </div>
        </DashboardWidget>
    );
}
