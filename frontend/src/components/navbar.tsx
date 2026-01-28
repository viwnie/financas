'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/notification-center';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials, cn } from '@/lib/utils';
import { Moon, Sun, Globe, LogOut, Wallet, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from 'react';
import { UserProfileModal } from '@/components/user-profile-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PrivacyToggle } from '@/components/privacy-blur';
import { motion } from 'framer-motion';

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { t, setLocale, locale } = useLanguage();
    const { resolvedTheme, setTheme } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [hoveredNav, setHoveredNav] = useState<string | null>(null);
    const [isThemeAnimating, setIsThemeAnimating] = useState(false);

    const isActive = (path: string) => pathname === path;

    const navLinks = [
        { href: '/dashboard', label: t('nav.dashboard') },
        { href: '/transactions', label: t('nav.transactions') },
        { href: '/categories', label: t('nav.categories') },
        { href: '/friends', label: t('nav.friends') },
    ];

    const handleLogout = () => {
        logout();
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        router.push('/auth/login');
    };

    return (
        <header className="fixed top-6 left-0 right-0 z-50">
            <nav className="mx-auto flex w-[96%] max-w-7xl items-center justify-between rounded-full border border-border/40 bg-background/55 px-4 py-3.5 backdrop-blur-md shadow-2xl shadow-black/10">
                <div className="flex items-center gap-6">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild className="md:hidden">
                            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="bg-background/90 backdrop-blur-xl">
                            <div className="flex flex-col space-y-4 mt-6">
                                <Link href="/dashboard" className="flex items-center gap-3 font-semibold" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Wallet className="h-5 w-5 text-primary" />
                                    <span>{t('common.brand')}</span>
                                </Link>
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={cn(
                                            "rounded-full px-3 py-2 text-sm font-medium transition-all",
                                            isActive(link.href)
                                                ? "bg-muted/60 text-foreground"
                                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                        )}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </SheetContent>
                    </Sheet>

                    <Link href="/dashboard" className="flex items-center gap-2 pl-1">
                        <Wallet className="w-6 h-6 text-primary" />
                        <span className="hidden text-lg font-semibold tracking-tight text-foreground sm:inline-block">{t('common.brand')}</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => {
                            const active = isActive(link.href);
                            const showHighlight = hoveredNav === link.href || active;

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onMouseEnter={() => setHoveredNav(link.href)}
                                    onMouseLeave={() => setHoveredNav(null)}
                                    className={cn(
                                        "relative px-4 py-2 text-sm font-medium transition-colors",
                                        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {showHighlight && (
                                        <motion.div
                                            layoutId="nav-hover"
                                            className={cn(
                                                "absolute inset-0 rounded-full",
                                                active ? "bg-primary/10" : "bg-muted/60"
                                            )}
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <span className="relative z-10">{link.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-3 pr-1">
                    <NotificationCenter />
                    <PrivacyToggle className="text-muted-foreground hover:text-foreground hover:bg-muted" />

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                            setIsThemeAnimating(true);
                        }}
                        onAnimationEnd={() => setIsThemeAnimating(false)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full w-9 h-9"
                    >
                        <span className={cn("relative inline-flex items-center justify-center", isThemeAnimating && "theme-toggle-anim")}>
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
                            <DropdownMenuItem onClick={() => setLocale("pt")}>{t('common.language.pt')}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLocale("en")}>{t('common.language.en')}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLocale("es")}>{t('common.language.es')}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <UserProfileModal>
                        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full border border-border/40 bg-background/40 hover:bg-muted">
                            <Avatar className="h-8 w-8">
                                <AvatarImage
                                    src={user?.avatarMimeType ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/avatar/${user.username}?t=${user.avatarLastUpdated || 0}` : undefined}
                                    alt={user?.name || t('common.user')}
                                    className="object-cover"
                                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <AvatarFallback>{getInitials(user?.name || '')}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </UserProfileModal>

                    <Button variant="ghost" size="icon" onClick={handleLogout} title={t('nav.logout')} className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full w-9 h-9">
                        <LogOut className="h-[1.2rem] w-[1.2rem]" />
                    </Button>
                </div>
            </nav>
        </header>
    );
}
