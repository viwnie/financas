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

const navLinks = [
    { id: 'features', label: 'Recursos', href: '#features' },
    { id: 'benefits', label: 'Beneficios', href: '#benefits' },
    { id: 'plans', label: 'Planos', href: '#plans' },
    { id: 'faq', label: 'FAQ', href: '#faq' },
]

const featureCards = [
    {
        title: 'Visao total das despesas',
        description: 'Painel central com categorias, metas e historico em um so lugar.',
        icon: BarChart3,
    },
    {
        title: 'Metas e orcamentos inteligentes',
        description: 'Planeje o mes com limites claros e acompanhe o progresso em tempo real.',
        icon: Target,
    },
    {
        title: 'Compartilhamento seguro',
        description: 'Divida gastos com amigos ou equipes sem perder controle.',
        icon: Users,
    },
    {
        title: 'Insights acionaveis',
        description: 'Alertas e recomendacoes para cortar excessos e acelerar seus objetivos.',
        icon: Sparkles,
    },
    {
        title: 'Privacidade e seguranca',
        description: 'Seus dados ficam protegidos com camadas extras de seguranca.',
        icon: ShieldCheck,
    },
    {
        title: 'Rotina leve',
        description: 'Menos planilhas, mais tempo para pensar em estrategia.',
        icon: Leaf,
    },
]

const benefitBullets = [
    'Clareza financeira em minutos, nao horas.',
    'Organizacao por categorias, metas e recorrencias.',
    'Acompanhamento compartilhado com total controle.',
    'Exportacao rapida para analises externas.',
]

const plans = [
    {
        name: 'Essencial',
        badge: 'ESSENCIAL',
        icon: '🟢',
        monthlyPrice: 29,
        description: 'Organize suas financas sem conectar bancos.',
        features: [
            'Importacao de extratos via CSV, OFX e PDF (com ou sem senha)',
            'Classificacao automatica de gastos',
            'Dashboard de receitas e despesas',
            'Historico financeiro mensal',
            'Relatorios basicos por categoria e periodo',
        ],
        excluded: ['Open Finance: nao incluido'],
        cta: 'Comecar gratis',
        footnote: 'Ideal para quem quer clareza e controle usando seus proprios extratos.',
    },
    {
        name: 'Pro',
        badge: 'PRO',
        icon: '🔵',
        monthlyPrice: 59,
        description: 'Automacao financeira com analises inteligentes. Menos trabalho manual, mais clareza para decidir.',
        features: [
            'Tudo do Essencial +',
            'Conexao Open Finance com ate 3 contas bancarias',
            'Sincronizacao automatica de transacoes',
            'Atualizacao diaria de saldos',
            'Metas financeiras',
            'Relatorios detalhados por categoria e periodo',
        ],
        assistantTitle: 'Finlo Assistant para:',
        assistantItems: ['analises de gastos', 'resumos mensais', 'insights financeiros sob demanda'],
        cta: 'Comecar gratis',
        footnote: 'Ideal para quem usa 1 ou 2 bancos no dia a dia',
        highlight: true,
        highlightLabel: 'Popular',
    },
    {
        name: 'Avancado',
        badge: 'AVANCADO',
        icon: '🟣',
        monthlyPrice: 99,
        description: 'Planejamento financeiro completo com IA. Visao total da sua vida financeira.',
        features: [
            'Tudo do Pro +',
            'Conexao Open Finance com ate 10 contas bancarias',
            'Atualizacoes mais frequentes ao longo do dia',
            'Alertas financeiros personalizados',
            'Relatorios avancados e comparativos historicos',
            'Exportacao de dados',
            'Acesso antecipado a novas funcionalidades',
        ],
        assistantTitle: 'Finlo Assistant Avancado:',
        assistantItems: ['analises comparativas', 'projecoes guiadas', 'acompanhamento da evolucao financeira'],
        cta: 'Comecar gratis',
        footnote: 'Ideal para quem quer controle maximo e planejamento detalhado',
    },
]

const testimonials = [
    {
        name: 'Ana Costa',
        role: 'Analista',
        quote: 'A visao consolidada e os alertas mudaram minha forma de decidir.',
    },
    {
        name: 'Pedro Lima',
        role: 'Autonomo',
        quote: 'Organizei meus gastos em dias. Tudo ficou muito mais claro.',
    },
    {
        name: 'Juliana Reis',
        role: 'Consultora',
        quote: 'Consigo acompanhar tudo em um painel simples.',
    },
]

const faqs = [
    {
        question: 'O Butler movimenta meu dinheiro?',
        answer: 'Nao. A plataforma e focada em organizacao, analise e planejamento.',
    },
    {
        question: 'Posso usar no celular?',
        answer: 'Sim. A experiencia e responsiva e funciona em qualquer dispositivo.',
    },
    {
        question: 'Como posso comecar?',
        answer: 'Crie sua conta gratuita e configure suas categorias e metas.',
    },
]

export default function LandingPage() {
    const [mounted, setMounted] = useState(false)
    const { setTheme, resolvedTheme } = useTheme()
    const { setLocale, locale } = useLanguage()
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

    const formatPrice = (value: number) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        }).format(value)

    const formatBalance = (value: number) =>
        new Intl.NumberFormat('pt-BR', {
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
                        <span className="text-xl font-semibold tracking-tight text-foreground">Butler Finance</span>
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
                                <span className="relative z-10">{link.label}</span>
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
                        <span className="sr-only">Toggle theme</span>
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
                            <DropdownMenuItem onClick={() => setLocale('pt')}>Portugues (BR)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLocale('en')}>English</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLocale('es')}>Espanol</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Link
                        href="/auth/login"
                        className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Entrar
                    </Link>
                    <Link
                        href="/auth/register"
                        className="px-6 py-2 bg-gradient-to-r from-primary to-emerald-500 hover:brightness-110 text-primary-foreground font-semibold rounded-full text-sm transition-all shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                    >
                        Comecar gratis
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
                                Novo fluxo financeiro
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">
                                    Controle financeiro com{' '}
                                    <span
                                        className="text-gradient"
                                        onMouseMove={handleGradientMove}
                                        onMouseLeave={handleGradientLeave}
                                    >
                                        previsibilidade
                                    </span>{' '}
                                    e foco em crescimento.
                                </h1>
                                <p className="text-lg text-muted-foreground max-w-2xl">
                                    Centralize despesas, metas e orcamentos em um painel unico. Tenha clareza para decidir,
                                    cortar excessos e manter seu dinheiro sempre no verde.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button size="lg" className="rounded-full h-12 px-8 text-sm font-semibold shadow-lg shadow-primary/25" asChild>
                                    <Link href="/auth/register">
                                        Comecar agora <ArrowRight className="ml-2 size-4" />
                                    </Link>
                                </Button>
                                <Button variant="outline" size="lg" className="rounded-full h-12 px-8 text-sm font-semibold" asChild>
                                    <Link href="#features">Conhecer recursos</Link>
                                </Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 text-sm text-muted-foreground">
                                {['Dashboard estrategico', 'Metas e recorrencias', 'Compartilhamento seguro', 'Exportacao rapida'].map((item) => (
                                    <div key={item} className="flex items-center gap-2">
                                        <Check className="size-4 text-primary" />
                                        <span>{item}</span>
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
                                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Resumo</p>
                                        <p className="text-lg font-semibold">Painel executivo</p>
                                    </div>
                                    <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">Atualizado</span>
                                </div>

                                <div className="grid gap-4">
                                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                        <p className="text-xs text-muted-foreground">Saldo projetado</p>
                                        <p className="text-2xl font-semibold">R$ {formatBalance(balanceValue)}</p>
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
                                            <p className="text-xs text-muted-foreground">Metas ativas</p>
                                            <p className="text-xl font-semibold">4 metas</p>
                                            <p className="text-xs text-muted-foreground mt-2">2 em andamento</p>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                            <p className="text-xs text-muted-foreground">Despesas do mes</p>
                                            <p className="text-xl font-semibold">R$ 6.240</p>
                                            <p className="text-xs text-muted-foreground mt-2">-12% vs. ultimo mes</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/10 via-transparent to-emerald-500/10 p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Alertas inteligentes</p>
                                        <p className="text-sm font-medium">2 categorias acima do limite</p>
                                    </div>
                                    <span className="text-xs font-semibold text-primary">Ver detalhes</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <section id="features" className="py-24 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-4">
                            Recursos
                        </div>
                        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-12">
                            Tudo o que voce precisa para manter o caixa no verde.
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
                                        <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
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
                                Beneficios
                            </div>
                            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
                                Um fluxo financeiro que trabalha a seu favor.
                            </h2>
                            <p className="text-muted-foreground text-lg">
                                Organize o hoje, projete o futuro e mantenha sua rotina alinhada. Tudo em uma experiencia leve,
                                moderna e feita para quem quer controle real.
                            </p>
                            <div className="space-y-3">
                                {benefitBullets.map((item) => (
                                    <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span className="size-2 rounded-full bg-primary" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
                                { label: 'Tempo economizado', value: '12h/mes' },
                                { label: 'Metas acompanhadas', value: '4+ objetivos' },
                                { label: 'Categorias organizadas', value: '20+ tags' },
                                { label: 'Compartilhamentos', value: 'Time alinhado' },
                            ].map((stat) => (
                                <div key={stat.label} className="rounded-2xl border border-border/60 bg-card/70 p-5">
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                                    <p className="text-2xl font-semibold mt-2">{stat.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="plans" className="py-24 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center space-y-3 mb-12">
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Planos</p>
                            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
                                Comece no essencial e evolua quando precisar.
                            </h2>
                            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                                Sem complicacao. Escolha o pacote ideal para seu momento e cresca com previsibilidade.
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
                                    Anual <span className="text-primary">(Economize 20%)</span>
                                </label>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            {plans.map((plan, index) => {
                                const priceValue = isAnnual
                                    ? Math.round(plan.monthlyPrice * 0.8 * 100) / 100
                                    : plan.monthlyPrice
                                const billingLabel = isAnnual ? 'cobrado anualmente' : 'cobrado mensalmente'

                                return (
                                    <motion.div
                                        key={plan.name}
                                        className={`relative rounded-3xl border p-6 flex flex-col bg-card/70 ${
                                            plan.highlight ? 'border-primary shadow-2xl shadow-primary/20' : 'border-border/60'
                                        }`}
                                        initial={{ opacity: 0, y: 16 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.2 }}
                                        transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.05 }}
                                    >
                                        {plan.highlight && plan.highlightLabel && (
                                            <div className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-3xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                                                {plan.highlightLabel}
                                            </div>
                                        )}
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-2xl">{plan.icon}</span>
                                            <p className="text-base font-semibold text-muted-foreground">{plan.badge}</p>
                                        </div>

                                        <div className="mt-6 flex items-baseline justify-center gap-2">
                                            <AnimatePresence mode="wait">
                                                <motion.span
                                                    key={`${plan.name}-${isAnnual ? 'annual' : 'monthly'}`}
                                                    className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                                >
                                                    {formatPrice(priceValue)}
                                                </motion.span>
                                            </AnimatePresence>
                                            <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">/ mes</span>
                                        </div>
                                        <p className="text-xs leading-5 text-muted-foreground text-center">{billingLabel}</p>

                                        <p className="mt-4 text-sm font-medium text-foreground text-center">{plan.description}</p>
                                        <hr className="w-full my-4 border-border/60" />

                                        <ul className="mt-2 gap-2 flex flex-col text-sm text-muted-foreground">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-2">
                                                    <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                                                    <span className="text-left">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {plan.excluded && (
                                            <div className="mt-4 text-sm text-muted-foreground">
                                                {plan.excluded.map((item) => (
                                                    <div key={item} className="flex items-start gap-2">
                                                        <X className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                                                        <span className="text-left">{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {plan.assistantTitle && plan.assistantItems && (
                                            <div className="mt-4 text-left">
                                                <p className="text-sm font-semibold text-foreground mb-2">{plan.assistantTitle}</p>
                                                <ul className="gap-1 flex flex-col ml-2 text-sm text-muted-foreground">
                                                    {plan.assistantItems.map((item) => (
                                                        <li key={item} className="flex items-baseline gap-2">
                                                            <span className="text-primary text-base/4">•</span>
                                                            <span className="text-left">{item}</span>
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
                                            <Link href="/auth/register">{plan.cta}</Link>
                                        </Button>
                                        <p className="mt-6 text-xs text-muted-foreground text-center">{plan.footnote}</p>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <section className="py-24 px-6 border-t border-border/60">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Depoimentos</p>
                            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
                                Pessoas que tomam decisoes com mais seguranca.
                            </h2>
                        </div>
                        <div className="grid gap-6 md:grid-cols-3">
                            {testimonials.map((testimonial) => (
                                <div key={testimonial.name} className="rounded-3xl border border-border/60 bg-card/70 p-6">
                                    <p className="text-sm text-muted-foreground leading-relaxed">"{testimonial.quote}"</p>
                                    <div className="mt-6">
                                        <p className="text-sm font-semibold">{testimonial.name}</p>
                                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="faq" className="py-24 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">FAQ</p>
                            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">Perguntas frequentes</h2>
                        </div>
                        <div className="space-y-4">
                            {faqs.map((faq) => (
                                <div key={faq.question} className="rounded-2xl border border-border/60 bg-card/70 p-6">
                                    <p className="font-semibold">{faq.question}</p>
                                    <p className="text-sm text-muted-foreground mt-2">{faq.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-6 pb-24">
                    <div className="max-w-6xl mx-auto rounded-3xl border border-border/60 bg-gradient-to-r from-primary/10 via-background to-emerald-500/15 p-10 md:p-16 flex flex-col lg:flex-row items-center justify-between gap-6">
                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pronto para comecar?</p>
                            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                                Entre hoje e veja seu dinheiro com outra clareza.
                            </h2>
                            <p className="text-muted-foreground">
                                Crie sua conta gratuita e organize seu fluxo financeiro em minutos.
                            </p>
                        </div>
                        <Button size="lg" className="rounded-full h-12 px-8 text-sm font-semibold shadow-lg shadow-primary/25" asChild>
                            <Link href="/auth/register">Criar conta</Link>
                        </Button>
                    </div>
                </section>
            </main>

            <footer className="py-8 border-t border-border/60 text-center text-sm text-muted-foreground">
                <p>© 2026 Butler Finance. Todos os direitos reservados.</p>
            </footer>
        </div>
    )
}
