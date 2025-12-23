import { api } from '@/lib/api';

export interface GamificationStatus {
    streak: number;
    // level: number; // Future
    // currentXp: number; // Future
    // nextLevelXp: number; // Future
    badges: Badge[];
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: Date;
}

export const gamificationService = {
    getStatus: async () => {
        const response = await api.get<GamificationStatus>('/gamification/status');
        return response.data;
    },

    getAllBadges: async () => {
        const response = await api.get<Badge[]>('/gamification/badges');
        return response.data;
    }
};
