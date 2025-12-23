import { api } from '@/lib/api';

export interface Budget {
    id: string;
    categoryId: string;
    amount: number; // Limit
    spent: number;
    period: 'MONTHLY' | 'WEEKLY' | 'YEARLY';
    category?: {
        id: string;
        name: string;
        translations: { name: string; language: string }[];
        userSettings: { color: string }[];
    };
}

export interface CreateBudgetDto {
    categoryId: string;
    amount: number;
    period: 'MONTHLY' | 'WEEKLY' | 'YEARLY';
}

export const budgetsService = {
    getAll: async () => {
        const response = await api.get<Budget[]>('/budgets');
        return response.data;
    },

    getStatus: async () => {
        const response = await api.get('/budgets/status');
        return response.data;
    },

    create: async (data: CreateBudgetDto) => {
        const response = await api.post('/budgets', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateBudgetDto>) => {
        const response = await api.patch(`/budgets/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/budgets/${id}`);
        return response.data;
    }
};
