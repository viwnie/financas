'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Locale = 'en' | 'pt';

type LanguageContextType = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
};

const translations = {
    en: {
        'dashboard.welcome': 'Welcome',
        'dashboard.transactions': 'Transactions',
        'dashboard.friends': 'Friends',
        'dashboard.invitations': 'Invitations',
        'dashboard.logout': 'Logout',
        'dashboard.totalIncome': 'Total Income',
        'dashboard.totalExpense': 'Total Expense',
        'dashboard.balance': 'Balance',
        'dashboard.expensesByCategory': 'Expenses by Category',
        'dashboard.evolution': 'Financial Evolution',
        'dashboard.noExpenses': 'No expenses yet',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'nav.dashboard': 'Dashboard',
        'nav.transactions': 'Transactions',
        'nav.friends': 'Friends',
        'nav.logout': 'Logout',
        'notifications.title': 'Notifications',
        'notifications.empty': 'No new notifications',
        'notifications.friendRequests': 'Friend Requests',
        'notifications.transactionInvites': 'Transaction Invites',
        'notifications.invitedYou': 'invited you to split:',
        'notifications.accept': 'Accept',
        'notifications.reject': 'Reject',
        'notifications.friendRequestUpdated': 'Friend request updated',
        'notifications.invitationUpdated': 'Invitation updated',
    },
    pt: {
        'dashboard.welcome': 'Bem-vindo',
        'dashboard.transactions': 'Transações',
        'dashboard.friends': 'Amigos',
        'dashboard.invitations': 'Convites',
        'dashboard.logout': 'Sair',
        'dashboard.totalIncome': 'Receita Total',
        'dashboard.totalExpense': 'Despesa Total',
        'dashboard.balance': 'Saldo',
        'dashboard.expensesByCategory': 'Despesas por Categoria',
        'dashboard.evolution': 'Evolução Financeira',
        'dashboard.noExpenses': 'Sem despesas ainda',
        'common.loading': 'Carregando...',
        'common.error': 'Erro',
        'nav.dashboard': 'Dashboard',
        'nav.transactions': 'Transações',
        'nav.friends': 'Amigos',
        'nav.logout': 'Sair',
        'notifications.title': 'Notificações',
        'notifications.empty': 'Nenhuma nova notificação',
        'notifications.friendRequests': 'Solicitações de Amizade',
        'notifications.transactionInvites': 'Convites de Transação',
        'notifications.invitedYou': 'convidou você para dividir:',
        'notifications.accept': 'Aceitar',
        'notifications.reject': 'Rejeitar',
        'notifications.friendRequestUpdated': 'Solicitação de amizade atualizada',
        'notifications.invitationUpdated': 'Convite atualizado',
    }
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

    return (
        <LanguageContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
    return context;
};
