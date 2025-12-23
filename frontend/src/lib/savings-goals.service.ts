import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface SavingsGoal {
    id: string;
    name: string;
    targetAmount: number | string;
    currentAmount: number | string;
    deadline?: string;
    status: string;
    icon?: string;
    color?: string;
}

export const SavingsGoalsService = {
    getAll: async (token: string) => {
        const response = await axios.get<SavingsGoal[]>(`${API_URL}/savings-goals`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    create: async (token: string, data: any) => {
        const response = await axios.post<SavingsGoal>(`${API_URL}/savings-goals`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    delete: async (token: string, id: string) => {
        await axios.delete(`${API_URL}/savings-goals/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }
};
