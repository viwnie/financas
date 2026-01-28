'use client';

import { useSettingsStore } from '@/store/settings-store';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';

interface PrivacyBlurProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    blurStrength?: 'sm' | 'md' | 'lg';
}

export function PrivacyBlur({
    children,
    blurStrength = 'md',
    className,
    ...props
}: PrivacyBlurProps) {
    const { privacyMode } = useSettingsStore();

    if (!privacyMode) {
        return <span className={className} {...props}>{children}</span>;
    }

    return (
        <span
            className={cn(
                "select-none transition-all duration-300",
                privacyMode && "bg-foreground/10 text-transparent rounded-sm animate-pulse",
                privacyMode && blurStrength === 'sm' && "blur-[4px]",
                privacyMode && blurStrength === 'md' && "blur-[6px]",
                privacyMode && blurStrength === 'lg' && "blur-[8px]",
                className
            )}
            {...props}
        >
            {// Render children but they are hidden by transparent text and blur
                children
            }
        </span>
    );
}

export function PrivacyToggle({ className }: { className?: string }) {
    const { privacyMode, togglePrivacyMode } = useSettingsStore();
    const { t } = useLanguage();

    return (
        <button
            onClick={togglePrivacyMode}
            className={cn("p-2 rounded-full hover:bg-muted transition-colors", className)}
            title={privacyMode ? t('privacy.showSensitive') : t('privacy.hideSensitive')}
        >
            {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
    );
}
