'use client';

import { DashboardWidget } from "./dashboard-widget";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";

export function OneTapEntryWidget() {
    const router = useRouter();
    const { t } = useLanguage();

    return (
        <DashboardWidget title={t('transactions.quickAddTitle')} className="lg:hidden">
            {/* Hidden on desktop as requested 'for Mobile view' */}
            <div className="grid grid-cols-2 gap-2">
                <Button
                    className="h-16 flex flex-col items-center justify-center bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800"
                    variant="ghost"
                    onClick={() => router.push('/transactions/new?type=EXPENSE')}
                >
                    <Plus className="w-5 h-5 mb-1" />
                    {t('transactions.expense')}
                </Button>
                <Button
                    className="h-16 flex flex-col items-center justify-center bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800"
                    variant="ghost"
                    onClick={() => router.push('/transactions/new?type=INCOME')}
                >
                    <Plus className="w-5 h-5 mb-1" />
                    {t('transactions.income')}
                </Button>
            </div>
        </DashboardWidget>
    );
}
