'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from './notifications/use-notifications';
import { NotificationList } from './notifications/notification-list';
import { FriendRequestList, TransactionInviteList, DeclinedRequestList } from './notifications/actionable-lists';

export function NotificationCenter() {
    const {
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
    } = useNotifications();

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
                <div className="p-4 border-b flex justify-between items-center">
                    <h4 className="font-semibold leading-none">{t('notifications.title')}</h4>
                    {persistentNotifications.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => deleteAllNotificationsMutation.mutate()}
                        >
                            {t('notifications.clearAll') || 'Clear All'}
                        </Button>
                    )}
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
                                <div className="space-y-1">
                                    <FriendRequestList
                                        items={friendRequests}
                                        onRespond={(id, status) => respondFriendMutation.mutate({ id, status })}
                                    />
                                    <TransactionInviteList
                                        items={invites}
                                        onRespond={(id, status) => respondInviteMutation.mutate({ id, status })}
                                        t={t}
                                    />
                                    <NotificationList
                                        notifications={persistentNotifications}
                                        onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                                        onDelete={(id) => deleteNotificationMutation.mutate(id)}
                                    />
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="actionable" className="m-0">
                            {totalActionable === 0 ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">
                                    No pending actions
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <FriendRequestList
                                        items={friendRequests}
                                        onRespond={(id, status) => respondFriendMutation.mutate({ id, status })}
                                    />
                                    <TransactionInviteList
                                        items={invites}
                                        onRespond={(id, status) => respondInviteMutation.mutate({ id, status })}
                                        t={t}
                                    />
                                    <DeclinedRequestList
                                        items={declinedRequests}
                                        onDismiss={(id) => dismissDeclinedMutation.mutate(id)}
                                    />
                                </div>
                            )}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
