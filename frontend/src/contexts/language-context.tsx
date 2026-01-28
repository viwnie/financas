'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { pt } from '@/locales/pt';
import { en } from '@/locales/en';
import { es } from '@/locales/es';

type Locale = 'en' | 'pt' | 'es';

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
    tList: (key: string) => string[];
}

const translations = {
    en,
    pt,
    es
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocale] = useState<Locale>('pt'); // Default to PT as requested

    useEffect(() => {
        const saved = localStorage.getItem('locale') as Locale;
        if (saved) setLocale(saved);
    }, []);

    const handleSetLocale = (l: Locale) => {
        setLocale(l);
        localStorage.setItem('locale', l);
    };

    const t = (key: string) => {
        return (translations[locale] as any)[key] || key;
    };

    const tList = (key: string) => {
        const value = (translations[locale] as any)[key];
        return Array.isArray(value) ? value : [];
    };

    return (
        <LanguageContext.Provider value={{ locale, setLocale: handleSetLocale, t, tList }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
    return context;
};
