'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function NotificationListener() {
    const { token, user } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!token || !user) return;

        const socket = io('http://localhost:3000', {
            auth: { token },
        });

        socket.on('connect', () => {
            console.log('Connected to notifications');
        });

        socket.on('friend_request', (data: { message: string }) => {
            toast.info(data.message, {
                action: {
                    label: 'View',
                    onClick: () => router.push('/friends')
                }
            });
        });

        socket.on('transaction_invitation', (data: { message: string }) => {
            toast.info(data.message, {
                action: {
                    label: 'View',
                    onClick: () => router.push('/transactions')
                }
            });
        });

        socket.on('transaction_update', (data: { message: string }) => {
            toast.info(data.message, {
                action: {
                    label: 'View',
                    onClick: () => router.push('/transactions')
                }
            });
        });

        socket.on('friend_request_declined', (data: any) => {
            toast.error('Friend Request Declined', {
                description: data.message,
            });
        });

        return () => {
            socket.off('friend_request');
            socket.off('friend_request_declined');
            socket.off('transaction_invite');
            socket.off('transaction_update');
            socket.disconnect();
        };
    }, [token, user, router]);

    return null;
}
