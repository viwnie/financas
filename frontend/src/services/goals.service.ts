import { api } from '@/lib/api';

export interface SavingsGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: Date;
    icon?: string;
    color?: string;
    isEmergencyFund: boolean;
}

export interface CreateGoalDto {
    name: string;
    targetAmount: number;
    deadline?: Date;
    icon?: string;
    color?: string;
}

export const goalsService = {
    getAll: async () => {
        const response = await api.get<SavingsGoal[]>('/savings-goals');
        return response.data;
    },

    getOne: async (id: string) => {
        const response = await api.get<SavingsGoal>(`/savings-goals/${id}`);
        return response.data;
    },

    create: async (data: CreateGoalDto) => {
        const response = await api.post('/savings-goals', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateGoalDto>) => {
        const response = await api.patch(`/savings-goals/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/savings-goals/${id}`);
        return response.data;
    }
};
