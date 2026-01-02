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
            <nav className="relative z-50 flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
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
                    {/* Theme Toggle Boolean */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-full w-9 h-9 transition-colors duration-500"
                    >
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:-rotate-180 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-180 scale-0 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:rotate-0 dark:scale-100" />
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
            <main className="relative z-10 flex flex-col justify-end min-h-[calc(100vh-80px)] overflow-hidden">
                <div className="w-full max-w-7xl mx-auto px-6 pt-10 flex-grow flex flex-col justify-center">

                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex justify-center mb-0"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/5 backdrop-blur-md shadow-sm dark:shadow-md dark:shadow-black/10 transition-colors duration-300">
                            <span className="text-sm font-medium text-[#4D3C10] dark:text-[#FFF8E1] tracking-wide">Finanças Pessoais Reinventadas</span>
                        </div>
                    </motion.div>

                    {/* Heading */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-center mb-4"
                    >
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
                            A inteligência financeira<br />
                            que sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4B87C] via-[#F2D798] to-[#C6A668]">mente precisa.</span>
                        </h1>
                    </motion.div>

                    {/* Subheading */}
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-center text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        Chega de planilhas complicadas. Una a ciência comportamental à simplicidade para organizar
                        seu dinheiro, conquistar objetivos e viver sem ansiedade.
                    </motion.p>
                    {/* Plant Container - Anchored Bottom */}
                    <motion.div className="relative flex justify-center items-end w-full max-w-lg mx-auto mt-auto">
                        <div className="relative w-[500px] h-[350px] flex items-end justify-center">
                            {/* Background Glows */}
                            <div className="absolute bottom-0 left-10 w-72 h-72 bg-[#C6A668]/30 rounded-full blur-[90px] mix-blend-screen" />
                            <div className="absolute bottom-0 right-10 w-72 h-72 bg-blue-500/30 rounded-full blur-[90px] mix-blend-screen" />

                            {/* Central Plant */}
                            <Image
                                src="/Planta.png"
                                alt="Crescimento"
                                width={320}
                                height={380}
                                className="relative z-20 drop-shadow-[0_0_25px_rgba(100,200,255,0.2)]"
                            />

                            {/* Decorative Elements */}
                            {/* Arrow next to brain */}
                            <Image
                                src="/seta.png"
                                alt="Seta"
                                width={65}
                                height={65}
                                className="absolute z-10 drop-shadow-[0_0_25px_rgba(100,200,255,0.15)] opacity-70"
                                style={{
                                    bottom: '145px',
                                    left: '105px',
                                    rotate: '14deg'
                                }}
                            />
                            {/* Arrow pointing to shield */}
                            <Image
                                src="/seta.png"
                                alt="Seta"
                                width={70}
                                height={70}
                                className="absolute z-10 drop-shadow-[0_0_25px_rgba(100,200,255,0.15)] opacity-60"
                                style={{
                                    bottom: '180px',
                                    left: '330px',
                                    rotate: '98deg'
                                }}
                            />
                            {/* Escudo */}
                            <Image
                                src="/escudo.png"
                                alt="Escudo"
                                width={90}
                                height={90}
                                className="absolute z-10 drop-shadow-[0_0_25px_rgba(100,200,255,0.15)] opacity-80"
                                style={{
                                    bottom: '110px',
                                    left: '380px'
                                }}
                            />
                            {/* Cerebro */}
                            <Image
                                src="/cerebro.png"
                                alt="Cerebro"
                                width={100}
                                height={100}
                                className="absolute z-10 drop-shadow-[0_0_25px_rgba(100,200,255,0.15)] opacity-80"
                                style={{
                                    bottom: '60px',
                                    left: '30px'
                                }}
                            />
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
                            title="Clareza Total"
                            description="Visualize para onde vai cada centavo. Gráficos intuitivos que traduzem números em decisões inteligentes, eliminando a incerteza do fim do mês."
                            color="orange"
                        />
                        <FeatureCard
                            icon="/Cerebro_planta.png"
                            title="Hábito sem Esforço"
                            description="Projetado para criar bons hábitos. O design comportamental torna o controle financeiro natural e recompensador, não uma obrigação chata."
                            color="blue"
                        />
                        <FeatureCard
                            icon="/escudo.png"
                            title="Segurança & Paz"
                            description="Seus dados blindados e sua mente tranquila. Tecnologia de ponta e transparência total para você focar no que realmente importa: seus sonhos."
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
