'use client';

import { useMemo, useState } from 'react';
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

type RegisterForm = {
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true';

export default function RegisterPage() {
    const { t } = useLanguage();
    const registerSchema = useMemo(() => z.object({
        name: z.string().min(2, t('auth.register.errors.nameRequired')),
        username: z.string().min(3, t('auth.register.errors.usernameMin')),
        email: z.string().email(t('auth.register.errors.invalidEmail')),
        password: z.string().min(6, t('auth.register.errors.passwordMin')),
        confirmPassword: z.string().min(6, t('auth.register.errors.confirmPasswordRequired')),
    }).refine((data) => data.password === data.confirmPassword, {
        message: t('auth.register.errors.passwordsMismatch'),
        path: ["confirmPassword"],
    }), [t]);
    const router = useRouter();
    const login = useAuthStore((state) => state.login);
    const [error, setError] = useState('');
    const googleAuthUrl = `${API_URL}/auth/google`;

    const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const mutation = useMutation({
        mutationFn: async (data: RegisterForm) => {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || t('auth.register.errors.registrationFailed'));
            }

            return res.json();
        },
        onSuccess: (data) => {
            login(data.user, data.access_token);
            // Set cookie for middleware
            document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Strict`;
            router.push('/dashboard');
        },
        onError: (err) => {
            setError(err.message);
        },
    });

    // Helper functions for capitalization
    const toTitleCase = (str: string) => {
        return str.toLowerCase().split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const toFirstUpper = (str: string) => {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const onSubmit = (data: RegisterForm) => {
        setError('');
        mutation.mutate(data);
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-32 top-[-18rem] h-[30rem] w-[30rem] rounded-full bg-primary/15 blur-3xl" />
                <div className="absolute bottom-[-12rem] right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-emerald-500/20 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.04),transparent_45%,rgba(15,23,42,0.08))]" />
                <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
            </div>

            <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col-reverse items-center gap-10 px-6 py-12 lg:flex-row lg:gap-16">
                <div className="w-full space-y-8 lg:w-3/5 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                            <span className="text-lg font-semibold tracking-tight">{t('auth.brand.initials')}</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">{t('common.brand')}</p>
                            <p className="text-sm text-muted-foreground">{t('auth.register.brandTagline')}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">{t('auth.register.kicker')}</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            {t('auth.register.title')} <span className="text-gradient">{t('auth.register.titleHighlight')}</span>.
                        </h1>
                        <p className="text-base text-muted-foreground">
                            {t('auth.register.subtitle')}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('auth.register.block1Title')}</p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                                {t('auth.register.block1Description')}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('auth.register.block2Title')}</p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                                {t('auth.register.block2Description')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            {t('auth.register.badgeCompliance')}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <span className="size-2 rounded-full bg-primary" />
                            {t('auth.register.badgeApproval')}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <span className="size-2 rounded-full bg-amber-400" />
                            {t('auth.register.badgeReports')}
                        </span>
                    </div>
                </div>

                <Card className="w-full max-w-md border-border/60 bg-card/80 shadow-2xl shadow-black/10 backdrop-blur animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
                    <CardHeader className="space-y-2">
                        <CardTitle className="text-2xl">{t('auth.register.cardTitle')}</CardTitle>
                        <CardDescription>{t('auth.register.cardSubtitle')}</CardDescription>
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
                                    {t('auth.register.continueGoogle')}
                                </Button>
                                <div className="flex items-center gap-3">
                                    <span className="h-px flex-1 bg-border/60" />
                                    <span className="text-xs text-muted-foreground">{t('common.or')}</span>
                                    <span className="h-px flex-1 bg-border/60" />
                                </div>
                            </div>
                        )}
                        <form onSubmit={handleSubmit(onSubmit)} className={`space-y-5 ${GOOGLE_ENABLED ? 'pt-4' : ''}`}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('auth.register.nameLabel')}</Label>
                                    <Input
                                        id="name"
                                        placeholder={t('auth.register.namePlaceholder')}
                                        className="bg-background/60"
                                        {...register('name', {
                                            onChange: (e) => {
                                                e.target.value = toTitleCase(e.target.value);
                                                return e;
                                            }
                                        })}
                                    />
                                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="username">{t('auth.register.usernameLabel')}</Label>
                                    <Input
                                        id="username"
                                        placeholder="Usuário"
                                        className="bg-background/60"
                                        {...register('username', {
                                            onChange: (e) => {
                                                e.target.value = toFirstUpper(e.target.value);
                                                return e;
                                            }
                                        })}
                                    />
                                    {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('auth.register.emailLabel')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t('auth.register.emailPlaceholder')}
                                    className="bg-background/60"
                                    {...register('email', {
                                        onChange: (e) => {
                                            e.target.value = toFirstUpper(e.target.value);
                                            return e;
                                        }
                                    })}
                                />
                                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">{t('auth.register.passwordLabel')}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder={t('auth.register.passwordPlaceholder')}
                                    className="bg-background/60"
                                    {...register('password')}
                                />
                                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">{t('auth.register.confirmPasswordLabel')}</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder={t('auth.register.confirmPasswordPlaceholder')}
                                    className="bg-background/60"
                                    {...register('confirmPassword')}
                                />
                                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
                            </div>
                            {error && <p className="text-sm text-destructive">{error}</p>}
                            <Button
                                type="submit"
                                className="w-full h-10 text-sm font-semibold shadow-lg shadow-primary/20"
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? t('auth.register.submitting') : t('auth.register.submit')}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <p className="text-sm text-muted-foreground">
                            {t('auth.register.haveAccount')}{" "}
                            <Link href="/auth/login" className="font-semibold text-primary hover:text-primary/80">
                                {t('auth.register.signInLink')}
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
