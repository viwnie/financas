'use client';

import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Moon, Sun, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type LoginForm = {
    email: string;
    password: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true';

export default function LoginPage() {
    const { t, locale, setLocale } = useLanguage();
    const { setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isThemeAnimating, setIsThemeAnimating] = useState(false);

    // Initial hooks
    const loginSchema = useMemo(() => z.object({
        email: z.string().email(t('auth.login.errors.invalidEmail')),
        password: z.string().min(6, t('auth.login.errors.passwordMin')),
    }), [t]);

    const router = useRouter();
    const login = useAuthStore((state) => state.login);
    const [error, setError] = useState('');
    const googleAuthUrl = `${API_URL}/auth/google`;

    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const mutation = useMutation({
        mutationFn: async (data: LoginForm) => {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                throw new Error(t('auth.login.errors.loginFailed'));
            }

            return res.json();
        },
        onSuccess: (data) => {
            login(data.user, data.access_token);
            // Set cookie for middleware
            document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Strict`;
            router.push('/dashboard');
        },
        onError: () => {
            setError(t('auth.login.errors.invalidCredentials'));
        },
    });

    const onSubmit = (data: LoginForm) => {
        setError('');
        mutation.mutate(data);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isThemeAnimating) return;
        const timeout = window.setTimeout(() => setIsThemeAnimating(false), 450);
        return () => window.clearTimeout(timeout);
    }, [isThemeAnimating]);

    if (!mounted) {
        return null;
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary/15 blur-3xl" />
                <div className="absolute bottom-[-10rem] right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-emerald-500/20 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.04),transparent_45%,rgba(15,23,42,0.08))]" />
                <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
            </div>

            <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                        setIsThemeAnimating(true);
                    }}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full w-9 h-9"
                >
                    <span
                        className={cn(
                            "relative inline-flex items-center justify-center",
                            isThemeAnimating && "theme-toggle-anim"
                        )}
                    >
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-180 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-180 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </span>
                    <span className="sr-only">{t('common.toggleTheme')}</span>
                </Button>

                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full w-9 h-9">
                            <Globe className="h-[1.2rem] w-[1.2rem]" />
                            <span className="absolute bottom-1 right-0 text-[9px] font-extrabold uppercase text-foreground leading-none">
                                {locale}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocale('pt')}>{t('common.language.pt')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocale('en')}>{t('common.language.en')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocale('es')}>{t('common.language.es')}</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col-reverse items-center gap-10 px-6 py-12 lg:flex-row lg:gap-16">
                <div
                    className="w-full space-y-8 lg:w-3/5 animate-in fade-in slide-in-from-bottom-6 duration-700"
                    style={{ animationFillMode: 'both' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                            <span className="text-lg font-semibold tracking-tight">{t('auth.brand.initials')}</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">{t('common.brand')}</p>
                            <p className="text-sm text-muted-foreground">{t('auth.login.brandTagline')}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{t('auth.login.kicker')}</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            {t('auth.login.title')} <span className="text-gradient">{t('auth.login.titleHighlight')}</span>.
                        </h1>
                        <p className="text-base text-muted-foreground">
                            {t('auth.login.subtitle')}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('auth.login.block1Title')}</p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                                {t('auth.login.block1Description')}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('auth.login.block2Title')}</p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                                {t('auth.login.block2Description')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            {t('auth.login.badgeSecurity')}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <span className="size-2 rounded-full bg-primary" />
                            {t('auth.login.badgeGovernance')}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <span className="size-2 rounded-full bg-amber-400" />
                            {t('auth.login.badgeEsg')}
                        </span>
                    </div>
                </div>

                <Card
                    className="w-full max-w-md border-border/60 bg-card/80 shadow-2xl shadow-black/10 backdrop-blur animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150"
                    style={{ animationFillMode: 'both' }}
                >
                    <CardHeader className="space-y-2">
                        <CardTitle className="text-2xl">{t('auth.login.cardTitle')}</CardTitle>
                        <CardDescription>{t('auth.login.cardSubtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {GOOGLE_ENABLED && (
                            <div className="space-y-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-10 text-sm font-semibold cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/60 hover:shadow-sm"
                                    onClick={() => {
                                        window.location.href = googleAuthUrl;
                                    }}
                                >
                                    <svg
                                        aria-hidden="true"
                                        viewBox="0 0 24 24"
                                        className="size-4"
                                    >
                                        <path
                                            fill="#EA4335"
                                            d="M12 10.2v3.6h5.05c-.22 1.17-.89 2.17-1.9 2.83v2.35h3.07c1.79-1.65 2.83-4.08 2.83-6.98 0-.64-.06-1.26-.17-1.85H12z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 21c2.43 0 4.47-.8 5.96-2.18l-3.07-2.35c-.85.57-1.94.9-2.89.9-2.22 0-4.1-1.5-4.77-3.52H4.06v2.41C5.54 19.7 8.55 21 12 21z"
                                        />
                                        <path
                                            fill="#4A90E2"
                                            d="M7.23 13.85A5.4 5.4 0 0 1 7 12c0-.64.11-1.26.23-1.85V7.74H4.06A9.002 9.002 0 0 0 3 12c0 1.46.35 2.84 1.06 4.06l3.17-2.21z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M12 6.6c1.32 0 2.5.46 3.43 1.35l2.57-2.57C16.47 3.9 14.43 3 12 3 8.55 3 5.54 4.3 4.06 7.74l3.17 2.41C7.9 8.1 9.78 6.6 12 6.6z"
                                        />
                                    </svg>
                                    {t('auth.login.continueGoogle')}
                                </Button>
                                <div className="flex items-center gap-3">
                                    <span className="h-px flex-1 bg-border/60" />
                                    <span className="text-xs text-muted-foreground">{t('common.or')}</span>
                                    <span className="h-px flex-1 bg-border/60" />
                                </div>
                            </div>
                        )}
                        <form onSubmit={handleSubmit(onSubmit)} className={`space-y-5 ${GOOGLE_ENABLED ? 'pt-4' : ''}`}>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('auth.login.emailLabel')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t('auth.login.emailPlaceholder')}
                                    className="bg-background/60"
                                    {...register('email')}
                                />
                                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">{t('auth.login.passwordLabel')}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder={t('auth.login.passwordPlaceholder')}
                                    className="bg-background/60"
                                    {...register('password')}
                                />
                                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                            </div>
                            {error && <p className="text-sm text-destructive">{error}</p>}
                            <Button
                                type="submit"
                                className="w-full h-10 text-sm font-semibold shadow-lg shadow-primary/20"
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? t('auth.login.submitting') : t('auth.login.submit')}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <p className="text-sm text-muted-foreground">
                            {t('auth.login.noAccount')}{" "}
                            <Link href="/auth/register" className="font-semibold text-primary hover:text-primary/80">
                                {t('auth.login.createAccount')}
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
