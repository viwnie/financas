'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, animate, motion } from 'framer-motion'
import {
    ArrowRight,
    BarChart3,
    Check,
    Globe,
    Leaf,
    Moon,
    ShieldCheck,
    Sparkles,
    Sun,
    Target,
    Users,
    Wallet,
    X,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const localeMap: Record<string, string> = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
}

const navLinks = [
    { id: 'features', labelKey: 'landing.nav.features', href: '#features' },
    { id: 'benefits', labelKey: 'landing.nav.benefits', href: '#benefits' },
    { id: 'plans', labelKey: 'landing.nav.plans', href: '#plans' },
    { id: 'faq', labelKey: 'landing.nav.faq', href: '#faq' },
]

const featureCards = [
    {
        titleKey: 'landing.features.items.0.title',
        descriptionKey: 'landing.features.items.0.description',
        icon: BarChart3,
    },
    {
        titleKey: 'landing.features.items.1.title',
        descriptionKey: 'landing.features.items.1.description',
        icon: Target,
    },
    {
        titleKey: 'landing.features.items.2.title',
        descriptionKey: 'landing.features.items.2.description',
        icon: Users,
    },
    {
        titleKey: 'landing.features.items.3.title',
        descriptionKey: 'landing.features.items.3.description',
        icon: Sparkles,
    },
    {
        titleKey: 'landing.features.items.4.title',
        descriptionKey: 'landing.features.items.4.description',
        icon: ShieldCheck,
    },
    {
        titleKey: 'landing.features.items.5.title',
        descriptionKey: 'landing.features.items.5.description',
        icon: Leaf,
    },
]

const benefitBullets = [
    'landing.benefits.bullets.0',
    'landing.benefits.bullets.1',
    'landing.benefits.bullets.2',
    'landing.benefits.bullets.3',
]

const heroHighlights = [
    'landing.hero.highlights.0',
    'landing.hero.highlights.1',
    'landing.hero.highlights.2',
    'landing.hero.highlights.3',
]

const benefitStats = [
    { labelKey: 'landing.benefits.stats.0.label', valueKey: 'landing.benefits.stats.0.value' },
    { labelKey: 'landing.benefits.stats.1.label', valueKey: 'landing.benefits.stats.1.value' },
    { labelKey: 'landing.benefits.stats.2.label', valueKey: 'landing.benefits.stats.2.value' },
    { labelKey: 'landing.benefits.stats.3.label', valueKey: 'landing.benefits.stats.3.value' },
]

const plans = [
    {
        nameKey: 'landing.plans.essential.name',
        badgeKey: 'landing.plans.essential.badge',
        iconKey: 'landing.plans.essential.icon',
        monthlyPrice: 29,
        descriptionKey: 'landing.plans.essential.description',
        featureKeys: [
            'landing.plans.essential.features.0',
            'landing.plans.essential.features.1',
            'landing.plans.essential.features.2',
            'landing.plans.essential.features.3',
            'landing.plans.essential.features.4',
        ],
        excludedKeys: ['landing.plans.essential.excluded.0'],
        ctaKey: 'landing.plans.cta',
        footnoteKey: 'landing.plans.essential.footnote',
    },
    {
        nameKey: 'landing.plans.pro.name',
        badgeKey: 'landing.plans.pro.badge',
        iconKey: 'landing.plans.pro.icon',
        monthlyPrice: 59,
        descriptionKey: 'landing.plans.pro.description',
        featureKeys: [
            'landing.plans.pro.features.0',
            'landing.plans.pro.features.1',
            'landing.plans.pro.features.2',
            'landing.plans.pro.features.3',
            'landing.plans.pro.features.4',
            'landing.plans.pro.features.5',
        ],
        assistantTitleKey: 'landing.plans.pro.assistantTitle',
        assistantItemKeys: [
            'landing.plans.pro.assistantItems.0',
            'landing.plans.pro.assistantItems.1',
            'landing.plans.pro.assistantItems.2',
        ],
        ctaKey: 'landing.plans.cta',
        footnoteKey: 'landing.plans.pro.footnote',
        highlight: true,
        highlightLabelKey: 'landing.plans.pro.highlight',
    },
    {
        nameKey: 'landing.plans.advanced.name',
        badgeKey: 'landing.plans.advanced.badge',
        iconKey: 'landing.plans.advanced.icon',
        monthlyPrice: 99,
        descriptionKey: 'landing.plans.advanced.description',
        featureKeys: [
            'landing.plans.advanced.features.0',
            'landing.plans.advanced.features.1',
            'landing.plans.advanced.features.2',
            'landing.plans.advanced.features.3',
            'landing.plans.advanced.features.4',
            'landing.plans.advanced.features.5',
            'landing.plans.advanced.features.6',
        ],
        assistantTitleKey: 'landing.plans.advanced.assistantTitle',
        assistantItemKeys: [
            'landing.plans.advanced.assistantItems.0',
            'landing.plans.advanced.assistantItems.1',
            'landing.plans.advanced.assistantItems.2',
        ],
        ctaKey: 'landing.plans.cta',
        footnoteKey: 'landing.plans.advanced.footnote',
    },
]

const testimonials = [
    {
        nameKey: 'landing.testimonials.items.0.name',
        roleKey: 'landing.testimonials.items.0.role',
        quoteKey: 'landing.testimonials.items.0.quote',
    },
    {
        nameKey: 'landing.testimonials.items.1.name',
        roleKey: 'landing.testimonials.items.1.role',
        quoteKey: 'landing.testimonials.items.1.quote',
    },
    {
        nameKey: 'landing.testimonials.items.2.name',
        roleKey: 'landing.testimonials.items.2.role',
        quoteKey: 'landing.testimonials.items.2.quote',
    },
]

const faqs = [
    {
        questionKey: 'landing.faq.items.0.question',
        answerKey: 'landing.faq.items.0.answer',
    },
    {
        questionKey: 'landing.faq.items.1.question',
        answerKey: 'landing.faq.items.1.answer',
    },
    {
        questionKey: 'landing.faq.items.2.question',
        answerKey: 'landing.faq.items.2.answer',
    },
]

export default function LandingPage() {
    const [mounted, setMounted] = useState(false)
    const { setTheme, resolvedTheme } = useTheme()
    const { setLocale, locale, t } = useLanguage()
    const [hoveredNav, setHoveredNav] = useState<string | null>(null)
    const [isAnnual, setIsAnnual] = useState(false)
    const [isThemeAnimating, setIsThemeAnimating] = useState(false)
    const [isBillingAnimating, setIsBillingAnimating] = useState(false)
    const [balanceValue, setBalanceValue] = useState(0)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isThemeAnimating) return
        const timeout = window.setTimeout(() => setIsThemeAnimating(false), 450)
        return () => window.clearTimeout(timeout)
    }, [isThemeAnimating])

    useEffect(() => {
        if (!isBillingAnimating) return
        const timeout = window.setTimeout(() => setIsBillingAnimating(false), 350)
        return () => window.clearTimeout(timeout)
    }, [isBillingAnimating])

    useEffect(() => {
        const controls = animate(0, 18420, {
            duration: 1.1,
            ease: 'easeOut',
            onUpdate: (value) => setBalanceValue(value),
        })
        return () => controls.stop()
    }, [])

    if (!mounted) {
        return null
    }

    const formatLocale = localeMap[locale] || 'pt-BR'

    const formatPrice = (value: number) =>
        new Intl.NumberFormat(formatLocale, {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        }).format(value)

    const formatBalance = (value: number) =>
        new Intl.NumberFormat(formatLocale, {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(Math.round(value))

    const handleGradientMove = (
        event: React.MouseEvent<HTMLElement, MouseEvent>
    ) => {
        const target = event.currentTarget
        const rect = target.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        target.style.setProperty('--reflect-x', `${x}px`)
        target.style.setProperty('--reflect-y', `${y}px`)
        target.style.setProperty('--reflect-alpha', '0.45')
    }

    const handleGradientLeave = (
        event: React.MouseEvent<HTMLElement, MouseEvent>
    ) => {
        const target = event.currentTarget
        target.style.removeProperty('--reflect-x')
        target.style.removeProperty('--reflect-y')
        target.style.setProperty('--reflect-alpha', '0')
    }

    const handleNavClick = (
        event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
        href: string
    ) => {
        if (!href.startsWith('#')) return
        event.preventDefault()
        const target = document.querySelector(href)
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            window.history.pushState(null, '', href)
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute bottom-[-12rem] right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-emerald-500/25 blur-3xl" />
                <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(16,185,129,0.18)_1px,transparent_1px)] [background-size:26px_26px]" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(3,105,161,0.06),transparent_40%,rgba(16,185,129,0.12))]" />
            </div>

            <nav className="fixed top-6 left-0 right-0 z-50 flex items-center justify-between px-6 py-3.5 w-[96%] max-w-7xl mx-auto bg-background/55 backdrop-blur-md border border-border/40 rounded-full shadow-2xl shadow-black/10">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 pl-2">
                        <Wallet className="w-6 h-6 text-primary" />
                        <span className="text-xl font-semibold tracking-tight text-foreground">{t('common.brand')}</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.id}
                                    href={link.href}
                                    onClick={(event) => handleNavClick(event, link.href)}
                                    onMouseEnter={() => setHoveredNav(link.id)}
                                    onMouseLeave={() => setHoveredNav(null)}
                                    className="relative px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                {hoveredNav === link.id && (
                                    <motion.div
                                        layoutId="nav-hover"
                                        className="absolute inset-0 rounded-full bg-muted/60"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10">{t(link.labelKey)}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4 pr-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                            setIsThemeAnimating(true)
                        }}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full w-9 h-9"
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
                            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted rounded-full w-9 h-9">
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

                    <Link
                        href="/auth/login"
                        className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('nav.login')}
                    </Link>
                    <Link
                        href="/auth/register"
                        className="px-6 py-2 bg-gradient-to-r from-primary to-emerald-500 hover:brightness-110 text-primary-foreground font-semibold rounded-full text-sm transition-all shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                    >
                        {t('nav.getStarted')}
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 pt-28">
                <section className="relative px-6 pb-16">
                    <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center min-h-[85vh]">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="space-y-8"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-card/70 backdrop-blur text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                {t('landing.hero.badge')}
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">
                                    {t('landing.hero.title.prefix')}{' '}
                                    <span
                                        className="text-gradient"
                                        onMouseMove={handleGradientMove}
                                        onMouseLeave={handleGradientLeave}
                                    >
                                        {t('landing.hero.title.highlight')}
                                    </span>{' '}
                                    {t('landing.hero.title.suffix')}
                                </h1>
                                <p className="text-lg text-muted-foreground max-w-2xl">
                                    {t('landing.hero.subtitle')}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button size="lg" className="rounded-full h-12 px-8 text-sm font-semibold shadow-lg shadow-primary/25" asChild>
                                    <Link href="/auth/register">
                                        {t('landing.hero.ctaPrimary')} <ArrowRight className="ml-2 size-4" />
                                    </Link>
                                </Button>
                                <Button variant="outline" size="lg" className="rounded-full h-12 px-8 text-sm font-semibold" asChild>
                                    <Link href="#features">{t('landing.hero.ctaSecondary')}</Link>
                                </Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 text-sm text-muted-foreground">
                                {heroHighlights.map((item) => (
                                    <div key={item} className="flex items-center gap-2">
                                        <Check className="size-4 text-primary" />
                                        <span>{t(item)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="relative"
                        >
                            <div className="rounded-3xl border border-border/60 bg-card/80 shadow-2xl shadow-black/10 backdrop-blur p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t('landing.hero.summary.label')}</p>
                                        <p className="text-lg font-semibold">{t('landing.hero.summary.title')}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">{t('landing.hero.summary.badge')}</span>
                                </div>

                                <div className="grid gap-4">
                                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                        <p className="text-xs text-muted-foreground">{t('landing.hero.summary.projectedBalance')}</p>
                                        <p className="text-2xl font-semibold">{formatBalance(balanceValue)}</p>
                                        <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
                                            <motion.div
                                                className="h-2 rounded-full bg-primary"
                                                initial={{ width: 0 }}
                                                animate={{ width: '66%' }}
                                                transition={{ duration: 1.1, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                            <p className="text-xs text-muted-foreground">{t('landing.hero.summary.goalsLabel')}</p>
                                            <p className="text-xl font-semibold">{t('landing.hero.summary.goalsValue')}</p>
                                            <p className="text-xs text-muted-foreground mt-2">{t('landing.hero.summary.goalsHelper')}</p>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                            <p className="text-xs text-muted-foreground">{t('landing.hero.summary.expensesLabel')}</p>
                                            <p className="text-xl font-semibold">{t('landing.hero.summary.expensesValue')}</p>
                                            <p className="text-xs text-muted-foreground mt-2">{t('landing.hero.summary.expensesHelper')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/10 via-transparent to-emerald-500/10 p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground">{t('landing.hero.summary.alertsLabel')}</p>
                                        <p className="text-sm font-medium">{t('landing.hero.summary.alertsValue')}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-primary">{t('landing.hero.summary.alertsCta')}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <section id="features" className="py-24 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-4">
                            {t('landing.features.label')}
                        </div>
                        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-12">
                            {t('landing.features.title')}
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {featureCards.map((feature, index) => {
                                const Icon = feature.icon
                                return (
                                    <motion.div
                                        key={feature.title}
                                        className="group rounded-3xl border border-border/60 bg-card/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
                                        initial={{ opacity: 0, y: 16 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.2 }}
                                        transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.05 }}
                                    >
                                        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5">
                                            <Icon className="size-5" />
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">{t(feature.titleKey)}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{t(feature.descriptionKey)}</p>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <section id="benefits" className="py-24 px-6 border-t border-border/60">
                    <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-[0.2em]">
                                {t('landing.benefits.label')}
                            </div>
                            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
                                {t('landing.benefits.title')}
                            </h2>
                            <p className="text-muted-foreground text-lg">
                                {t('landing.benefits.description')}
                            </p>
                            <div className="space-y-3">
                                {benefitBullets.map((item) => (
                                    <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span className="size-2 rounded-full bg-primary" />
                                        <span>{t(item)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {benefitStats.map((stat) => (
                                <div key={stat.labelKey} className="rounded-2xl border border-border/60 bg-card/70 p-5">
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t(stat.labelKey)}</p>
                                    <p className="text-2xl font-semibold mt-2">{t(stat.valueKey)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="plans" className="py-24 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center space-y-3 mb-12">
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t('landing.plans.label')}</p>
                            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
                                {t('landing.plans.title')}
                            </h2>
                            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                                {t('landing.plans.subtitle')}
                            </p>
                            <div
                                className={cn(
                                    "mt-6 flex items-center justify-center gap-3",
                                    isBillingAnimating && "billing-toggle-anim"
                                )}
                            >
                                <Switch
                                    id="billing-toggle"
                                    checked={isAnnual}
                                    onCheckedChange={(nextValue) => {
                                        setIsAnnual(nextValue)
                                        setIsBillingAnimating(true)
                                    }}
                                />
                                <label htmlFor="billing-toggle" className="text-sm font-semibold">
                                    {t('landing.plans.toggleAnnual')}{' '}
                                    <span className="text-primary">({t('landing.plans.toggleDiscount')})</span>
                                </label>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            {plans.map((plan, index) => {
                                const priceValue = isAnnual
                                    ? Math.round(plan.monthlyPrice * 0.8 * 100) / 100
                                    : plan.monthlyPrice
                                const billingLabel = isAnnual ? t('landing.plans.billingAnnual') : t('landing.plans.billingMonthly')

                                return (
                                    <motion.div
                                        key={plan.nameKey}
                                        className={`relative rounded-3xl border p-6 flex flex-col bg-card/70 ${
                                            plan.highlight ? 'border-primary shadow-2xl shadow-primary/20' : 'border-border/60'
                                        }`}
                                        initial={{ opacity: 0, y: 16 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.2 }}
                                        transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.05 }}
                                    >
                                        {plan.highlight && plan.highlightLabelKey && (
                                            <div className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-3xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                                                {t(plan.highlightLabelKey)}
                                            </div>
                                        )}
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-2xl">{t(plan.iconKey)}</span>
                                            <p className="text-base font-semibold text-muted-foreground">{t(plan.badgeKey)}</p>
                                        </div>

                                        <div className="mt-6 flex items-baseline justify-center gap-2">
                                            <AnimatePresence mode="wait">
                                                <motion.span
                                                    key={`${plan.nameKey}-${isAnnual ? 'annual' : 'monthly'}`}
                                                    className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                                >
                                                    {formatPrice(priceValue)}
                                                </motion.span>
                                            </AnimatePresence>
                                            <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">{t('landing.plans.perMonth')}</span>
                                        </div>
                                        <p className="text-xs leading-5 text-muted-foreground text-center">{billingLabel}</p>

                                        <p className="mt-4 text-sm font-medium text-foreground text-center">{t(plan.descriptionKey)}</p>
                                        <hr className="w-full my-4 border-border/60" />

                                        <ul className="mt-2 gap-2 flex flex-col text-sm text-muted-foreground">
                                            {plan.featureKeys.map((feature) => (
                                                <li key={feature} className="flex items-start gap-2">
                                                    <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                                                    <span className="text-left">{t(feature)}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {plan.excludedKeys && (
                                            <div className="mt-4 text-sm text-muted-foreground">
                                                {plan.excludedKeys.map((item) => (
                                                    <div key={item} className="flex items-start gap-2">
                                                        <X className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                                                        <span className="text-left">{t(item)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {plan.assistantTitleKey && plan.assistantItemKeys && (
                                            <div className="mt-4 text-left">
                                                <p className="text-sm font-semibold text-foreground mb-2">{t(plan.assistantTitleKey)}</p>
                                                <ul className="gap-1 flex flex-col ml-2 text-sm text-muted-foreground">
                                                    {plan.assistantItemKeys.map((item) => (
                                                        <li key={item} className="flex items-baseline gap-2">
                                                            <span className="text-primary text-base/4">?</span>
                                                            <span className="text-left">{t(item)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="flex-grow" />
                                        <hr className="w-full my-4 border-border/60" />

                                        <Button
                                            className={`rounded-full h-11 text-sm font-semibold ${
                                                plan.highlight ? '' : 'bg-transparent text-foreground border border-border/60 hover:bg-muted'
                                            }`}
                                            variant={plan.highlight ? 'default' : 'outline'}
                                            asChild
                                        >
                                            <Link href="/auth/register">{t(plan.ctaKey)}</Link>
                                        </Button>
                                        <p className="mt-6 text-xs text-muted-foreground text-center">{t(plan.footnoteKey)}</p>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <section className="py-24 px-6 border-t border-border/60">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t('landing.testimonials.label')}</p>
                            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
                                {t('landing.testimonials.title')}
                            </h2>
                        </div>
                        <div className="grid gap-6 md:grid-cols-3">
                            {testimonials.map((testimonial) => (
                                <div key={testimonial.nameKey} className="rounded-3xl border border-border/60 bg-card/70 p-6">
                                    <p className="text-sm text-muted-foreground leading-relaxed">"{t(testimonial.quoteKey)}"</p>
                                    <div className="mt-6">
                                        <p className="text-sm font-semibold">{t(testimonial.nameKey)}</p>
                                        <p className="text-xs text-muted-foreground">{t(testimonial.roleKey)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="faq" className="py-24 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t('landing.faq.label')}</p>
                            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">{t('landing.faq.title')}</h2>
                        </div>
                        <div className="space-y-4">
                            {faqs.map((faq) => (
                                <div key={faq.questionKey} className="rounded-2xl border border-border/60 bg-card/70 p-6">
                                    <p className="font-semibold">{t(faq.questionKey)}</p>
                                    <p className="text-sm text-muted-foreground mt-2">{t(faq.answerKey)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-6 pb-24">
                    <div className="max-w-6xl mx-auto rounded-3xl border border-border/60 bg-gradient-to-r from-primary/10 via-background to-emerald-500/15 p-10 md:p-16 flex flex-col lg:flex-row items-center justify-between gap-6">
                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t('landing.cta.label')}</p>
                            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                                {t('landing.cta.title')}
                            </h2>
                            <p className="text-muted-foreground">
                                {t('landing.cta.description')}
                            </p>
                        </div>
                        <Button size="lg" className="rounded-full h-12 px-8 text-sm font-semibold shadow-lg shadow-primary/25" asChild>
                            <Link href="/auth/register">{t('landing.cta.button')}</Link>
                        </Button>
                    </div>
                </section>
            </main>

            <footer className="py-8 border-t border-border/60 text-center text-sm text-muted-foreground">
                <p>{t('landing.footer.copyright')}</p>
            </footer>
        </div>
    )
}
