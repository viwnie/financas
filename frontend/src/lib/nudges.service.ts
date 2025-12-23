import { useAuthStore } from "@/store/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface Nudge {
    type: string;
    title: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
    scope: string;
    categoryId?: string;
}

export const useNudgesService = () => {
    const { token } = useAuthStore();

    const getActiveNudges = async (): Promise<Nudge[]> => {
        const response = await fetch(`${API_URL}/nudges/active`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch nudges');
        }

        return response.json();
    }

    return { getActiveNudges };
};
