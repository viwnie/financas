'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardWidgetProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    action?: React.ReactNode;
}

export function DashboardWidget({
    title,
    description,
    children,
    className,
    contentClassName,
    action
}: DashboardWidgetProps) {
    return (
        <Card className={cn("h-full flex flex-col", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </div>
                {action && <div>{action}</div>}
            </CardHeader>
            <CardContent className={cn("flex-1 pt-2", contentClassName)}>
                {children}
            </CardContent>
        </Card>
    );
}
