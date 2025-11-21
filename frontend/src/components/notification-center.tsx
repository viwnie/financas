'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, X, Trash2, Info, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { useLanguage } from '@/contexts/language-context';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

interface PersistentNotification {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    type: string;
    data?: any;
}

export function NotificationCenter() {
    const { token, user } = useAuthStore();
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    // Fetch Persistent Notifications
    const { data: persistentNotifications = [] } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications');
            return res.data;
        },
        enabled: !!token,
    });

    // Fetch Friend Requests
    const { data: friendRequests = [] } = useQuery({
        queryKey: ['friendRequests'],
        queryFn: async () => {
            const res = await api.get('/friends/pending');
            return res.data;
        },
        enabled: !!token,
    });

    // Fetch Transaction Invites
    const { data: invites = [] } = useQuery({
        queryKey: ['shared-invitations'],
        queryFn: async () => {
            const res = await api.get('/shared-transactions/pending');
            return res.data;
        },
        enabled: !!token,
    });

    // Fetch Declined Requests
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

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {totalNotifications > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full p-0 text-[10px]"
                        >
                            {totalNotifications}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
                <div className="p-4 border-b">
                    <h4 className="font-semibold leading-none">{t('notifications.title')}</h4>
                </div>

                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                        <TabsTrigger
                            value="all"
                            className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                            All
                        </TabsTrigger>
                        <TabsTrigger
                            value="actionable"
                            className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                            Actionable
                            {totalActionable > 0 && (
                                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                                    {totalActionable}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[400px]">
                        <TabsContent value="all" className="m-0">
                            {persistentNotifications.length === 0 && totalActionable === 0 ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">
                                    {t('notifications.empty')}
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {/* Actionable Items in All Tab */}
                                    {friendRequests.map((req: any) => (
                                        <div key={req.id} className="p-4 bg-accent/50">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="text-sm">
                                                    <span className="font-medium">{req.requester.name}</span>
                                                    <p className="text-xs text-muted-foreground">@{req.requester.username} sent a friend request</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => respondFriendMutation.mutate({ id: req.id, status: 'ACCEPTED' })}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => respondFriendMutation.mutate({ id: req.id, status: 'DECLINED' })}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {invites.map((inv: any) => (
                                        <div key={inv.id} className="p-4 bg-accent/50">
                                            <div className="flex flex-col gap-2">
                                                <div className="text-sm">
                                                    <span className="font-medium">{inv.transaction.creator.name}</span> {t('notifications.invitedYou')}
                                                    <p className="font-medium mt-1">${parseFloat(inv.transaction.amount).toFixed(2)} - {inv.transaction.description || 'Expense'}</p>
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="h-7 text-xs border-green-500 text-green-500" onClick={() => respondInviteMutation.mutate({ id: inv.id, status: 'ACCEPTED' })}>
                                                        {t('notifications.accept')}
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-500 text-red-500" onClick={() => respondInviteMutation.mutate({ id: inv.id, status: 'REJECTED' })}>
                                                        {t('notifications.reject')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Persistent Notifications */}
                                    {persistentNotifications.map((notification: PersistentNotification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 flex flex-col gap-2 ${notification.isRead ? 'bg-background' : 'bg-muted/30'}`}
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{notification.title}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-2">
                                                        {formatDistanceToNow(new Date(notification.createdAt), {
                                                            addSuffix: true,
                                                            locale: ptBR,
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    {!notification.isRead ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => markAsReadMutation.mutate(notification.id)}
                                                            title="Mark as read"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground"
                                                            disabled
                                                            title="Read"
                                                        >
                                                            <EyeOff className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                        onClick={() => deleteNotificationMutation.mutate(notification.id)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="actionable" className="m-0">
                            {totalActionable === 0 ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">
                                    No pending actions
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {friendRequests.map((req: any) => (
                                        <div key={req.id} className="p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="text-sm">
                                                    <span className="font-medium">{req.requester.name}</span>
                                                    <p className="text-xs text-muted-foreground">@{req.requester.username} sent a friend request</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => respondFriendMutation.mutate({ id: req.id, status: 'ACCEPTED' })}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => respondFriendMutation.mutate({ id: req.id, status: 'DECLINED' })}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {invites.map((inv: any) => (
                                        <div key={inv.id} className="p-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="text-sm">
                                                    <span className="font-medium">{inv.transaction.creator.name}</span> {t('notifications.invitedYou')}
                                                    <p className="font-medium mt-1">${parseFloat(inv.transaction.amount).toFixed(2)} - {inv.transaction.description || 'Expense'}</p>
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="h-7 text-xs border-green-500 text-green-500" onClick={() => respondInviteMutation.mutate({ id: inv.id, status: 'ACCEPTED' })}>
                                                        {t('notifications.accept')}
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-500 text-red-500" onClick={() => respondInviteMutation.mutate({ id: inv.id, status: 'REJECTED' })}>
                                                        {t('notifications.reject')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {declinedRequests.map((req: any) => (
                                        <div key={req.id} className="p-4 flex items-center justify-between">
                                            <div className="text-sm">
                                                <span className="font-medium">{req.addressee.name}</span> declined your request
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => dismissDeclinedMutation.mutate(req.id)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
