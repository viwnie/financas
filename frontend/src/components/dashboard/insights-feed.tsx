"use client";

import { AlertCircle, Lightbulb, X, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { useAuthStore } from "@/store/auth-store";

const ICON_MAP: Record<string, any> = {
    'warning': AlertCircle,
    'tip': Lightbulb,
    'info': Info
};

export function InsightsFeed() {
    const { token } = useAuthStore();

    const { data: insights } = useQuery({
        queryKey: ['dashboard-nudges'],
        queryFn: dashboardService.getNudges,
        enabled: !!token,
    });

    if (!insights || insights.length === 0) return null;


    return (
        <Card className="glass-card border-none shadow-none bg-transparent">
            <CardHeader className="pb-2 px-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Insights & Nudges
                </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-3">
                {insights.map((insight: any) => {
                    const Icon = ICON_MAP[insight.type] || Info;
                    const color = insight.type === 'warning' ? 'text-amber-500' : insight.type === 'tip' ? 'text-indigo-500' : 'text-blue-500';
                    const bg = insight.type === 'warning' ? 'bg-amber-500/10' : insight.type === 'tip' ? 'bg-indigo-500/10' : 'bg-blue-500/10';
                    const border = insight.type === 'warning' ? 'border-amber-500/20' : insight.type === 'tip' ? 'border-indigo-500/20' : 'border-blue-500/20';

                    return (
                        <div key={insight.id} className={`relative p-4 rounded-xl border ${bg} ${border} flex gap-4 transition-all hover:scale-[1.01] cursor-default`}>
                            <div className={`p-2 rounded-lg bg-background/50 h-fit ${color}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-start">
                                    <h4 className={`font-semibold text-sm ${color}`}>{insight.title}</h4>
                                    <button className="text-muted-foreground/50 hover:text-foreground transition-colors">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {insight.message}
                                </p>

                                {insight.action && (
                                    <Button size="sm" variant="link" className={`p-0 h-auto font-medium ${color} opacity-90 hover:opacity-100`}>
                                        {insight.action} →
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
