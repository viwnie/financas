import { api } from '@/lib/api';

export interface DashboardStats {
    income: { total: number };
    expense: { total: number };
    balance: { total: number };
    expensesByCategory: { categoryId: string; amount: number; name: string; color: string }[];
}

export interface EvolutionData {
    month: string;
    income: number;
    expense: number;
}

export interface Nudge {
    id: string;
    type: 'warning' | 'tip' | 'info';
    title: string;
    message: string;
    action?: string;
    icon?: string;
}

export const dashboardService = {
    getStats: async () => {
        const response = await api.get<DashboardStats>('/dashboard/stats');
        return response.data;
    },

    getEvolution: async () => {
        const response = await api.get<EvolutionData[]>('/dashboard/evolution');
        return response.data;
    },

    getComparison: async () => {
        const response = await api.get('/dashboard/comparison');
        return response.data;
    },

    getNudges: async () => {
        const response = await api.get<Nudge[]>('/nudges/active');
        return response.data;
    }
};
