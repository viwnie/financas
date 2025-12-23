"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plane, Plus } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { goalsService } from "@/services/goals.service";
import { useAuthStore } from "@/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

export function SavingsGoalProgress() {
    const { token } = useAuthStore();

    const { data: goals, isLoading } = useQuery({
        queryKey: ['goals'],
        queryFn: goalsService.getAll,
        enabled: !!token,
    });

    if (isLoading) {
        return (
            <Card className="glass-card border-none shadow-lg">
                <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    <Skeleton className="h-2 w-full mt-4" />
                </CardContent>
            </Card>
        )
    }

    // Use the first goal or a default empty state
    const mainGoal = goals && goals.length > 0 ? goals[0] : null;

    if (!mainGoal) {
        return (
            <Card className="glass-card border-none shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="p-3 bg-primary/10 rounded-full mb-4">
                        <Plane className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium">Nenhuma meta definida</h3>
                    <p className="text-sm text-muted-foreground mb-4">Crie sua primeira meta para acompanhar aqui.</p>
                    <Button variant="outline" size="sm">Criar Meta</Button>
                </CardContent>
            </Card>
        );
    }

    const percentage = Math.min((mainGoal.currentAmount / mainGoal.targetAmount) * 100, 100);

    return (
        <Card className="glass-card border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Meta Principal
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/20">
                    <Plus className="h-4 w-4 text-primary" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                        <Plane className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{mainGoal.name}</h3>
                        <p className="text-sm text-muted-foreground">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mainGoal.currentAmount)} de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mainGoal.targetAmount)}
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-primary">{percentage.toFixed(0)}%</span>
                        <span className="text-muted-foreground">Faltam {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mainGoal.targetAmount - mainGoal.currentAmount)}</span>
                    </div>
                    <Progress value={percentage} className="h-2.5 bg-secondary" indicatorClassName="bg-gradient-to-r from-blue-500 to-primary" />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button size="sm" className="w-full bg-primary/10 text-primary hover:bg-primary/20 border-0 shadow-none font-medium">
                        + R$ 50
                    </Button>
                    <Button size="sm" className="w-full bg-primary/10 text-primary hover:bg-primary/20 border-0 shadow-none font-medium">
                        + R$ 100
                    </Button>
                    <Button size="sm" variant="default" className="w-full shadow-md shadow-primary/20">
                        Boost 🚀
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
