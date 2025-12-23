'use client';

import { DashboardWidget } from "./dashboard-widget";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function OneTapEntryWidget() {
    const router = useRouter();

    return (
        <DashboardWidget title="Quick Add" className="lg:hidden">
            {/* Hidden on desktop as requested 'for Mobile view' */}
            <div className="grid grid-cols-2 gap-2">
                <Button
                    className="h-16 flex flex-col items-center justify-center bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800"
                    variant="ghost"
                    onClick={() => router.push('/transactions/new?type=EXPENSE')}
                >
                    <Plus className="w-5 h-5 mb-1" />
                    Expense
                </Button>
                <Button
                    className="h-16 flex flex-col items-center justify-center bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800"
                    variant="ghost"
                    onClick={() => router.push('/transactions/new?type=INCOME')}
                >
                    <Plus className="w-5 h-5 mb-1" />
                    Income
                </Button>
            </div>
        </DashboardWidget>
    );
}
