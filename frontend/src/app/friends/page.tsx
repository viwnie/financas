'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/app-shell';
import { Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/language-context';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface Friend {
    id: string;
    name: string;
    username: string;
}

interface FriendRequest {
    id: string;
    requester: {
        name: string;
        username: string;
    };
}

interface SentRequest {
    id: string;
    addressee: {
        name: string;
        username: string;
    };
}

interface UserSearch {
    name: string;
    username: string;
}

export default function FriendsPage() {
    const { token, user } = useAuthStore();
    const { t } = useLanguage();
    const queryClient = useQueryClient();

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [addError, setAddError] = useState('');
    const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);

    // State for Merge
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [selectedExternalFriend, setSelectedExternalFriend] = useState<string | null>(null);
    const [selectedMergeTarget, setSelectedMergeTarget] = useState<string | null>(null);

    // State for Merge Request Details
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedMergeRequest, setSelectedMergeRequest] = useState<string | null>(null);

    if (!user) {
        // Middleware handles this
    }

    // --- Queries ---

    const { data: friends = [] } = useQuery<Friend[]>({
        queryKey: ['friends'],
        queryFn: async () => {
            const res = await fetch('http://localhost:3000/friends', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(t('friends.errors.fetchFriends'));
            return res.json();
        },
        enabled: !!token,
    });

    const { data: requests = [] } = useQuery<FriendRequest[]>({
        queryKey: ['friendRequests'],
        queryFn: async () => {
            const res = await fetch('http://localhost:3000/friends/pending', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(t('friends.errors.fetchRequests'));
            return res.json();
        },
        enabled: !!token,
    });

    const { data: sentRequests = [] } = useQuery<SentRequest[]>({
        queryKey: ['sentRequests'],
        queryFn: async () => {
            const res = await fetch('http://localhost:3000/friends/sent', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(t('friends.errors.fetchSentRequests'));
            return res.json();
        },
        enabled: !!token,
    });

    const { data: searchResults = [] } = useQuery<UserSearch[]>({
        queryKey: ['userSearch', searchQuery],
        queryFn: async () => {
            if (searchQuery.length < 2) return [];
            const res = await fetch(`http://localhost:3000/users/search?q=${searchQuery}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!token && searchQuery.length >= 2,
    });

    const { data: externalFriends = [] } = useQuery<{ id: string | null, name: string }[]>({
        queryKey: ['externalFriends'],
        queryFn: async () => {
            const res = await fetch('http://localhost:3000/friends/external', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(t('friends.errors.fetchExternal'));
            return res.json();
        },
        enabled: !!token,
    });

    const { data: receivedMergeRequests = [] } = useQuery<{ id: string; requester: { name: string }; placeholderName: string }[]>({
        queryKey: ['receivedMergeRequests'],
        queryFn: async () => {
            const res = await fetch('http://localhost:3000/friends/merge/received', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(t('friends.errors.fetchMergeRequests'));
            return res.json();
        },
        enabled: !!token,
    });

    const { data: mergeDetails } = useQuery<any[]>({
        queryKey: ['mergeRequestDetails', selectedMergeRequest],
        queryFn: async () => {
            if (!selectedMergeRequest) return [];
            const res = await fetch(`http://localhost:3000/friends/merge/${selectedMergeRequest}/details`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(t('friends.errors.fetchMergeDetails'));
            return res.json();
        },
        enabled: !!selectedMergeRequest,
    });

    // --- Mutations ---

    const addFriendMutation = useMutation({
        mutationFn: async (username: string) => {
            const res = await fetch('http://localhost:3000/friends/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ username }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || t('friends.errors.sendRequest'));
            }
            return res.json();
        },
        onSuccess: () => {
            setSearchQuery('');
            setShowSuggestions(false);
            setAddError('');
            queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
            toast.success(t('friends.toast.requestSent'));
        },
        onError: (err) => {
            setAddError(err.message);
        },
    });

    const respondMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: 'ACCEPTED' | 'DECLINED' }) => {
            const res = await fetch(`http://localhost:3000/friends/respond/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error(t('friends.errors.respond'));
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['friends'] });
            queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
        },
    });

    const cancelRequestMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`http://localhost:3000/friends/request/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(t('friends.errors.cancelRequest'));
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
        },
    });

    const removeFriendMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`http://localhost:3000/friends/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(t('friends.errors.removeFriend'));
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['friends'] });
            toast.success(t('friends.toast.removed'));
        },
    });

    const addExternalFriendMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await fetch('http://localhost:3000/friends/external', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || t('friends.errors.addExternalFriend'));
            }
            return res.json();
        },
        onSuccess: () => {
            setSearchQuery('');
            setShowSuggestions(false);
            queryClient.invalidateQueries({ queryKey: ['externalFriends'] });
            toast.success(t('friends.toast.externalAdded'));
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteExternalFriendMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`http://localhost:3000/friends/external/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(t('friends.errors.deleteExternalFriend'));
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['externalFriends'] });
            toast.success(t('friends.toast.externalDeleted'));
        },
    });

    const createMergeRequestMutation = useMutation({
        mutationFn: async () => {
            if (!selectedExternalFriend || !selectedMergeTarget) return;
            const res = await fetch('http://localhost:3000/friends/merge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    placeholderName: selectedExternalFriend,
                    targetUsername: selectedMergeTarget
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || t('friends.errors.createMergeRequest'));
            }
            return res.json();
        },
        onSuccess: () => {
            setMergeModalOpen(false);
            setSelectedExternalFriend(null);
            setSelectedMergeTarget(null);
            toast.success(t('friends.toast.mergeSent'));
        },
        onError: (err) => toast.error(err.message)
    });

    const respondMergeMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: 'ACCEPTED' | 'REJECTED' }) => {
            const res = await fetch(`http://localhost:3000/friends/merge/${id}/respond`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error(t('friends.errors.respond'));
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receivedMergeRequests'] });
            queryClient.invalidateQueries({ queryKey: ['friends'] });
            setDetailsModalOpen(false);
            toast.success(t('friends.toast.responseSent'));
        },
    });

    // --- Handlers ---

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setShowSuggestions(true);
    };

    const handleSelectUser = (username: string) => {
        setSearchQuery(username);
        setShowSuggestions(false);
        addFriendMutation.mutate(username);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (searchResults.length > 0) {
                handleSelectUser(searchResults[0].username);
            } else if (searchQuery) {
                addFriendMutation.mutate(searchQuery);
            }
        }
    };

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="space-y-3">
                    <span className="app-chip">{t('friends.chip')}</span>
                    <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gradient">{t('friends.title')}</h1>
                    <p className="text-muted-foreground">{t('friends.subtitle')}</p>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-8">
                        <Card className="app-card">
                            <CardHeader>
                                <CardTitle>{t('friends.addTitle')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder={t('friends.searchPlaceholder')}
                                                value={searchQuery}
                                                onChange={handleSearchChange}
                                                onKeyDown={handleKeyDown}
                                                className="pl-8"
                                                onFocus={() => setShowSuggestions(true)}
                                            />
                                        </div>
                                        <Button
                                            onClick={() => addFriendMutation.mutate(searchQuery)}
                                            disabled={addFriendMutation.isPending || !searchQuery}
                                        >
                                            {addFriendMutation.isPending ? t('friends.sending') : t('friends.addButton')}
                                        </Button>
                                    </div>

                                    {showSuggestions && searchQuery && (
                                        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md">
                                            <ul className="py-1">
                                                {searchResults.map((user) => (
                                                    <li
                                                        key={user.username}
                                                        className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center gap-3"
                                                        onClick={() => handleSelectUser(user.username)}
                                                    >
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage
                                                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/avatar/${user.username}`}
                                                                alt={user.name}
                                                                className="object-cover"
                                                            />
                                                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span>{user.name}</span>
                                                            <span className="text-xs text-muted-foreground">@{user.username}</span>
                                                        </div>
                                                    </li>
                                                ))}
                                                {searchResults.length === 0 && (
                                                    <li
                                                        className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer flex justify-between items-center text-primary"
                                                        onClick={() => addExternalFriendMutation.mutate(searchQuery)}
                                                    >
                                                        <span>{t('friends.addExternalLabel').replace('{name}', searchQuery)}</span>
                                                        <UserPlus className="h-4 w-4" />
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                {addError && <p className="text-red-500 mt-2 text-sm">{addError}</p>}
                            </CardContent>
                        </Card>

                        {/* Received Merge Requests */}
                        {receivedMergeRequests.length > 0 && (
                            <Card className="app-card">
                                <CardHeader>
                                    <CardTitle>{t('friends.mergeRequestsTitle').replace('{count}', String(receivedMergeRequests.length))}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {receivedMergeRequests.map((req) => (
                                        <div key={req.id} className="flex items-center justify-between p-4 border border-border/60 rounded-2xl bg-background/60 transition-all hover:border-primary/30 hover:shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback>{getInitials(req.requester.name)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{t('friends.mergeFrom').replace('{name}', req.requester.name)}</p>
                                                    <p className="text-sm text-muted-foreground">{t('friends.mergeLinkWith').replace('{name}', req.placeholderName)}</p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedMergeRequest(req.id);
                                                    setDetailsModalOpen(true);
                                                }}
                                            >
                                                {t('friends.viewDetails')}
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {requests.length > 0 && (
                            <Card className="app-card">
                                <CardHeader>
                                    <CardTitle>{t('friends.pendingRequestsTitle').replace('{count}', String(requests.length))}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {requests.map((req) => (
                                        <div key={req.id} className="flex items-center justify-between p-4 border border-border/60 rounded-2xl bg-background/60 transition-all hover:border-primary/30 hover:shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage
                                                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/avatar/${req.requester.username}`}
                                                        alt={req.requester.name}
                                                        className="object-cover"
                                                    />
                                                    <AvatarFallback>{getInitials(req.requester.name)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{req.requester.name}</p>
                                                    <p className="text-sm text-muted-foreground">@{req.requester.username}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => respondMutation.mutate({ id: req.id, status: 'ACCEPTED' })}
                                                >
                                                    {t('friends.accept')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => respondMutation.mutate({ id: req.id, status: 'DECLINED' })}
                                                >
                                                    {t('friends.decline')}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {sentRequests.length > 0 && (
                            <Card className="app-card">
                                <CardHeader>
                                    <CardTitle>{t('friends.sentRequestsTitle').replace('{count}', String(sentRequests.length))}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {sentRequests.map((req) => (
                                        <div key={req.id} className="flex items-center justify-between p-4 border border-border/60 rounded-2xl bg-background/60 transition-all hover:border-primary/30 hover:shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage
                                                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/avatar/${req.addressee.username}`}
                                                        alt={req.addressee.name}
                                                        className="object-cover"
                                                    />
                                                    <AvatarFallback>{getInitials(req.addressee.name)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium">{req.addressee.name}</p>
                                                        <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full font-medium">
                                                            {t('friends.pendingStatus')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">@{req.addressee.username}</p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => cancelRequestMutation.mutate(req.id)}
                                                disabled={cancelRequestMutation.isPending}
                                            >
                                                {t('common.cancel')}
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-8">
                        <Card className="app-card">
                            <CardHeader>
                                <CardTitle>{t('friends.friendsTitle').replace('{count}', String(friends.length))}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {friends.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>{t('friends.emptyTitle')}</p>
                                        <p className="text-sm">{t('friends.emptyDescription')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {friends.map((friend) => (
                                            <div key={friend.username} className="flex items-center justify-between p-4 border border-border/60 rounded-2xl bg-background/60 transition-all hover:border-primary/30 hover:shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage
                                                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/avatar/${friend.username}`}
                                                            alt={friend.name}
                                                            className="object-cover"
                                                        />
                                                        <AvatarFallback>{getInitials(friend.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{friend.name}</p>
                                                        <p className="text-sm text-muted-foreground">@{friend.username}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setFriendToRemove(friend)}
                                                >
                                                    {t('friends.remove')}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* External Friends */}
                        <Card className="app-card">
                            <CardHeader>
                                <CardTitle>{t('friends.externalFriendsTitle').replace('{count}', String(externalFriends.length))}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {externalFriends.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>{t('friends.externalEmptyTitle')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {externalFriends.map((friend, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 border border-border/60 rounded-2xl bg-background/60 transition-all hover:border-primary/30 hover:shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarFallback>{getInitials(friend.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{friend.name}</p>
                                                        <p className="text-sm text-muted-foreground">{t('friends.externalParticipantLabel')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedExternalFriend(friend.name);
                                                            setMergeModalOpen(true);
                                                        }}
                                                    >
                                                        {t('friends.linkToUser')}
                                                    </Button>
                                                    {friend.id && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => deleteExternalFriendMutation.mutate(friend.id!)}
                                                        >
                                                            {t('common.delete')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <Dialog open={!!friendToRemove} onOpenChange={(open) => !open && setFriendToRemove(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('friends.dialogRemoveTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('friends.dialogRemoveDescription').replace('{name}', friendToRemove?.name || "")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFriendToRemove(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (friendToRemove) {
                                    removeFriendMutation.mutate(friendToRemove.id);
                                    setFriendToRemove(null);
                                }
                            }}
                        >
                            {t('friends.remove')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Merge Request Modal */}
            <Dialog open={mergeModalOpen} onOpenChange={setMergeModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('friends.dialogLinkTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('friends.dialogLinkDescription').replace('{name}', selectedExternalFriend || "")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            {friends.map(friend => (
                                <div
                                    key={friend.username}
                                    className={`p-3 border rounded cursor-pointer ${selectedMergeTarget === friend.username ? 'border-primary bg-primary/10' : 'hover:bg-accent'}`}
                                    onClick={() => setSelectedMergeTarget(friend.username)}
                                >
                                    <p className="font-medium">{friend.name}</p>
                                    <p className="text-xs text-muted-foreground">@{friend.username}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMergeModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button
                            onClick={() => createMergeRequestMutation.mutate()}
                            disabled={!selectedMergeTarget || createMergeRequestMutation.isPending}
                        >
                            {createMergeRequestMutation.isPending ? t('friends.sending') : t('friends.sendRequest')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Merge Details Modal */}
            <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('friends.dialogMergeDetailsTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('friends.dialogMergeDetailsDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {mergeDetails?.map((tx) => (
                            <div key={tx.id} className="p-3 border rounded bg-card">
                                <div className="flex justify-between">
                                    <span className="font-medium">{tx.description || t('friends.mergeNoDescription')}</span>
                                    <span>{new Date(tx.date).toLocaleDateString()}</span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    {t('friends.mergeTotal').replace('{amount}', Number(tx.amount).toFixed(2))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => respondMergeMutation.mutate({ id: selectedMergeRequest!, status: 'REJECTED' })}>
                            Reject
                        </Button>
                        <Button onClick={() => respondMergeMutation.mutate({ id: selectedMergeRequest!, status: 'ACCEPTED' })}>
                            {t('friends.accept')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
