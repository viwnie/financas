'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Wallet, Play, Moon, Sun, Globe } from 'lucide-react'
import { useTheme } from "next-themes"
import { useLanguage } from '@/contexts/language-context'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
    const [mounted, setMounted] = useState(false)
    const { theme, setTheme, resolvedTheme } = useTheme()
    const { t, setLocale, locale } = useLanguage()
    const [hoveredNav, setHoveredNav] = useState<string | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0A0F1E] text-slate-900 dark:text-white overflow-hidden font-sans selection:bg-[#C6A668]/30">

            {/* Subtle Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-blue-600/3 rounded-full blur-[120px]" />
                <div className="absolute top-[30%] right-[5%] w-[500px] h-[500px] bg-[#C6A668]/3 rounded-full blur-[100px]" />
            </div>


            {/* Navbar */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-slate-900 dark:text-white" />
                        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">FinanceApp</span>
                    </Link>

                    {/* Nav Links - Left Side */}
                    <div className="hidden md:flex items-center gap-1">
                        {[
                            { id: 'features', label: t('nav.resources'), href: '#features' },
                            { id: 'manifesto', label: t('nav.manifesto'), href: '#manifesto' },
                            { id: 'pricing', label: t('nav.pricing'), href: '#pricing' },
                        ].map((link) => (
                            <Link
                                key={link.id}
                                href={link.href}
                                onMouseEnter={() => setHoveredNav(link.id)}
                                onMouseLeave={() => setHoveredNav(null)}
                                className="relative px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                {hoveredNav === link.id && (
                                    <motion.div
                                        layoutId="nav-hover"
                                        className="absolute inset-0 bg-slate-200/50 dark:bg-white/10 rounded-lg"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10">{link.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Theme Toggle Boolean */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-full w-9 h-9"
                    >
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>

                    {/* Language Selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-full w-9 h-9">
                                <Globe className="h-[1.2rem] w-[1.2rem]" />
                                <span className="absolute bottom-1 right-0 text-[9px] font-extrabold uppercase text-slate-900 dark:text-white leading-none">
                                    {locale}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocale("pt")}>Português (BR)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLocale("en")}>English</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLocale("es")}>Español</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Link
                        href="/auth/login"
                        className="hidden sm:inline-flex px-5 py-2 text-sm font-medium text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-slate-300 transition-colors border border-slate-300 dark:border-slate-700 rounded-full hover:border-slate-400 dark:hover:border-slate-600 ml-2"
                    >
                        {t('nav.login')}
                    </Link>
                    <Link
                        href="/auth/register"
                        className="px-6 py-2 bg-gradient-to-r from-[#D4B87C] to-[#C6A668] hover:brightness-110 text-[#0F172A] font-semibold rounded-full text-sm transition-all shadow-[0_0_20px_rgba(198,166,104,0.25)] duration-300"
                    >
                        {t('nav.getStarted')}
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 pt-12 pb-20 px-6">
                <div className="max-w-7xl mx-auto">

                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex justify-center mb-8"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-md">
                            <span className="text-sm font-medium text-slate-300">Nova abordagem em finanças pessoais</span>
                        </div>
                    </motion.div>

                    {/* Heading */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-center mb-6"
                    >
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
                            Finanças desenhadas<br />
                            para a <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4B87C] via-[#F2D798] to-[#C6A668]">mente humana.</span>
                        </h1>
                    </motion.div>

                    {/* Subheading */}
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-center text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
                    >
                        Abandone as planilhas frias. O FinanceApp une design ético e ciência
                        comportamental para cultivar seu bem-estar financeiro, sem ansiedade.
                    </motion.p>

                    {/* Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
                    >
                        <Link
                            href="/auth/register"
                            className="px-8 py-3.5 bg-gradient-to-b from-[#D4B87C] to-[#C6A668] hover:brightness-110 text-[#0F172A] font-bold rounded-full text-base transition-all shadow-[0_4px_20px_rgba(198,166,104,0.3)] hover:scale-105 duration-300 min-w-[220px] text-center"
                        >
                            Criar minha conta
                        </Link>
                        <button className="group px-8 py-3.5 bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 rounded-full text-base transition-all duration-300 flex items-center gap-3 hover:bg-slate-900/50 min-w-[220px] justify-center">
                            <span className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-white group-hover:text-slate-950 transition-colors">
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </span>
                            Ver como funciona
                        </button>
                    </motion.div>

                    {/* MAIN GRAPHIC VISUALIZATION */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.4 }}
                        className="relative w-full max-w-5xl mx-auto h-[450px] md:h-[500px]"
                    >
                        {/* Base Glow Foundation */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px]">
                            {/* Outer Glow */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] bg-gradient-to-t from-[#C6A668]/8 via-[#C6A668]/4 to-transparent blur-[60px] rounded-t-full"></div>

                            {/* Layered Arcs */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[420px] h-[210px] border-[3px] border-slate-700/40 rounded-t-full"></div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[380px] h-[190px] border-[3px] border-slate-600/30 rounded-t-full"></div>

                            {/* Bright White Arc with Glow */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[440px] h-[220px] rounded-t-full"
                                style={{
                                    border: '4px solid transparent',
                                    borderTopColor: 'rgba(255,255,255,0.6)',
                                    borderLeftColor: 'rgba(255,255,255,0.2)',
                                    borderRightColor: 'rgba(255,255,255,0.2)',
                                    borderBottom: 'none',
                                    filter: 'drop-shadow(0 -2px 12px rgba(255,255,255,0.2))'
                                }}
                            ></div>
                        </div>

                        {/* Central Plant */}
                        <div className="absolute bottom-[80px] left-1/2 -translate-x-1/2 z-20 w-[280px] flex justify-center">
                            {/* Plant Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-gradient-to-b from-cyan-400/15 to-blue-400/10 blur-[50px] rounded-full"></div>
                            <Image
                                src="/Planta.png"
                                alt="Crescimento"
                                width={240}
                                height={280}
                                className="relative drop-shadow-[0_0_25px_rgba(100,200,255,0.2)] animate-float"
                                style={{ animationDuration: '6s' }}
                            />
                        </div>

                        {/* Left Card "Seus Recursos" */}
                        <div className="absolute bottom-[120px] left-[2%] md:left-[5%] lg:left-[8%] z-30">
                            <div className="relative group">
                                <div className="w-[240px] md:w-[260px] bg-gradient-to-br from-[#0F1419] to-[#0A0F1E] border border-slate-800/70 p-5 rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-500 hover:transform hover:scale-[1.02] hover:border-orange-500/40 hover:shadow-[0_0_30px_rgba(251,146,60,0.15)]">
                                    {/* Card Inner Glow */}
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/8 blur-[35px] rounded-full pointer-events-none"></div>

                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-600/10 flex items-center justify-center border border-orange-500/25 shadow-inner">
                                            <Wallet className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Seus Recursos</p>
                                            <p className="text-base font-bold text-white">R$ 5.420,00</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                                        <span className="text-[10px]">Saldo disponível para investir</span>
                                    </div>

                                    <div className="flex justify-center py-3">
                                        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] flex items-center justify-center border border-slate-700/50">
                                            <Image src="/cerebro.png" alt="Brain" width={32} height={32} className="opacity-90 drop-shadow-md" />
                                        </div>
                                    </div>
                                </div>

                                {/* Left Arrow */}
                                <div className="absolute -right-20 top-1/2 -translate-y-1/2 z-0 hidden lg:block opacity-50 group-hover:opacity-70 transition-opacity">
                                    <Image src="/seta.png" width={90} height={35} alt="arrow" className="rotate-[8deg]" />
                                </div>
                            </div>
                        </div>

                        {/* Right Card "Net Worth" */}
                        <div className="absolute bottom-[140px] right-[2%] md:right-[5%] lg:right-[8%] z-30">
                            <div className="relative group">
                                <div className="w-[240px] md:w-[260px] bg-gradient-to-br from-[#0F1419] to-[#0A0F1E] border border-slate-800/70 p-5 rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-500 hover:transform hover:scale-[1.02] hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]">
                                    {/* Card Inner Glow */}
                                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-cyan-500/8 blur-[35px] rounded-full pointer-events-none"></div>

                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Net Worth</p>
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.9)] animate-pulse"></div>
                                    </div>

                                    {/* Chart */}
                                    <div className="h-14 flex items-end gap-1 mb-4 px-0.5">
                                        {['h-[35%]', 'h-[48%]', 'h-[42%]', 'h-[58%]', 'h-[72%]', 'h-[65%]', 'h-[82%]'].map((h, i) => (
                                            <div
                                                key={i}
                                                className={`flex-1 bg-gradient-to-t from-cyan-600 via-cyan-500 to-blue-400 rounded-t-[2px] opacity-90 ${h} transition-all duration-300 hover:opacity-100`}
                                                style={{
                                                    boxShadow: '0 0 8px rgba(34, 211, 238, 0.3)'
                                                }}
                                            ></div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2.5 bg-gradient-to-br from-slate-900/70 to-slate-800/50 p-2.5 rounded-xl border border-slate-700/60 shadow-inner">
                                        <Image src="/Escudo_simples.png" alt="Shield" width={18} height={18} className="opacity-90" />
                                        <span className="text-[10px] font-bold text-cyan-400 tracking-widest">PROTECTED</span>
                                    </div>
                                </div>

                                {/* Right Arrow */}
                                <div className="absolute -left-20 top-1/2 -translate-y-1/2 z-0 hidden lg:block opacity-50 group-hover:opacity-70 transition-opacity">
                                    <Image src="/seta.png" width={90} height={35} alt="arrow" className="rotate-[172deg] scale-y-[-1]" />
                                </div>
                            </div>
                        </div>

                    </motion.div>

                </div>
            </main>

            {/* Philosophy Section */}
            <section id="features" className="py-20 bg-slate-50 dark:bg-[#0A0F1E] relative border-t border-slate-200 dark:border-slate-900/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white">Nossa Filosofia</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                        <FeatureCard
                            icon="/pessoa_planta.png"
                            title="Bem-Estar Financeiro"
                            description="Bem-Estar pensando à claridade, um econômio genia e do cálmido."
                            color="orange"
                        />
                        <FeatureCard
                            icon="/Cerebro_planta.png"
                            title="Economia Comportamental"
                            description="Economia comportamental aos hábitos smarters para cultivar seu bem-estar financeiro."
                            color="blue"
                        />
                        <FeatureCard
                            icon="/escudo.png"
                            title="Ética & Transparência"
                            description="Segurança e Ética transparência come a mantle de timascês e responsabilidade."
                            color="cyan"
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 bg-[#050511] border-t border-slate-900 text-center">
                <p className="text-slate-500 text-sm">© 2025 FinanceApp. Todos os direitos reservados.</p>
            </footer>
        </div>
    )
}

function FeatureCard({ icon, title, description, color }: { icon: string, title: string, description: string, color: string }) {
    const colors: Record<string, { gradient: string, border: string, glow: string }> = {
        orange: {
            gradient: 'from-orange-500/5 to-transparent',
            border: 'hover:border-orange-500/30',
            glow: 'bg-orange-500/10'
        },
        blue: {
            gradient: 'from-blue-500/5 to-transparent',
            border: 'hover:border-blue-500/30',
            glow: 'bg-blue-500/10'
        },
        cyan: {
            gradient: 'from-cyan-500/5 to-transparent',
            border: 'hover:border-cyan-500/30',
            glow: 'bg-cyan-500/10'
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className={`relative p-8 rounded-3xl bg-gradient-to-b ${colors[color].gradient} border border-slate-800/60 backdrop-blur-sm transition-all duration-300 group ${colors[color].border} hover:shadow-2xl`}
        >
            {/* Card Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 ${colors[color].glow} blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>

            <div className="flex flex-col items-center text-center relative z-10">
                <div className="relative mb-6">
                    <div className={`absolute inset-0 ${colors[color].glow} blur-2xl rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-500`}></div>
                    <Image
                        src={icon}
                        alt={title}
                        width={90}
                        height={90}
                        className="relative drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-500"
                    />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
            </div>
        </motion.div>
    )
}
