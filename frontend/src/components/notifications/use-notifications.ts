import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/contexts/language-context';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { api } from '@/lib/api';

export interface PersistentNotification {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    type: string;
    data?: any;
}

export function useNotifications() {
    const { token, user } = useAuthStore();
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    // Queries
    const { data: persistentNotifications = [] } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications');
            return res.data;
        },
        enabled: !!token,
    });

    const { data: friendRequests = [] } = useQuery({
        queryKey: ['friendRequests'],
        queryFn: async () => {
            const res = await api.get('/friends/pending');
            return res.data;
        },
        enabled: !!token,
    });

    const { data: invites = [] } = useQuery({
        queryKey: ['shared-invitations'],
        queryFn: async () => {
            const res = await api.get('/shared-transactions/pending');
            return res.data;
        },
        enabled: !!token,
    });

    const { data: declinedRequests = [] } = useQuery({
        queryKey: ['declinedRequests'],
        queryFn: async () => {
            const res = await api.get('/friends/declined');
            return res.data;
        },
        enabled: !!token,
    });

    // Socket Listener
    useEffect(() => {
        if (!token || !user) return;

        const socket = io('http://localhost:3000', {
            auth: { token },
        });

        socket.on('notification', () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.info('New notification received');
        });

        socket.on('friend_request', () => {
            queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
        });

        socket.on('transaction_invitation', () => {
            queryClient.invalidateQueries({ queryKey: ['shared-invitations'] });
        });

        return () => {
            socket.disconnect();
        };
    }, [token, user, queryClient]);

    const unreadPersistentCount = persistentNotifications.filter((n: PersistentNotification) => !n.isRead).length;
    const totalActionable = friendRequests.length + invites.length + declinedRequests.length;
    const totalNotifications = unreadPersistentCount + totalActionable;

    // Mutations
    const respondFriendMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: 'ACCEPTED' | 'DECLINED' }) => {
            await api.patch(`/friends/respond/${id}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
            queryClient.invalidateQueries({ queryKey: ['friends'] });
            toast.success(t('notifications.friendRequestUpdated'));
        },
    });

    const dismissDeclinedMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/friends/declined/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['declinedRequests'] });
        },
    });

    const respondInviteMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: 'ACCEPTED' | 'REJECTED' }) => {
            await api.patch(`/shared-transactions/respond/${id}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shared-invitations'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success(t('notifications.invitationUpdated'));
        },
    });

    const markAsReadMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const deleteNotificationMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/notifications/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const deleteAllNotificationsMutation = useMutation({
        mutationFn: async () => {
            await api.delete('/notifications');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success(t('notifications.allDeleted') || 'All notifications cleared');
        },
    });

    return {
        isOpen,
        setIsOpen,
        persistentNotifications,
        friendRequests,
        invites,
        declinedRequests,
        unreadPersistentCount,
        totalActionable,
        totalNotifications,
        respondFriendMutation,
        dismissDeclinedMutation,
        respondInviteMutation,
        markAsReadMutation,
        deleteNotificationMutation,
        deleteAllNotificationsMutation,
        t
    };
}
