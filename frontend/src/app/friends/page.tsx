'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Friend {
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
    const router = useRouter();
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
            if (!res.ok) throw new Error('Failed to fetch friends');
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
            if (!res.ok) throw new Error('Failed to fetch requests');
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
            if (!res.ok) throw new Error('Failed to fetch sent requests');
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

    const { data: externalFriends = [] } = useQuery<{ name: string }[]>({
        queryKey: ['externalFriends'],
        queryFn: async () => {
            const res = await fetch('http://localhost:3000/friends/external', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch external friends');
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
            if (!res.ok) throw new Error('Failed to fetch merge requests');
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
            if (!res.ok) throw new Error('Failed to fetch details');
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
                throw new Error(data.message || 'Failed to send request');
            }
            return res.json();
        },
        onSuccess: () => {
            setSearchQuery('');
            setShowSuggestions(false);
            setAddError('');
            queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
            toast.success('Friend request sent!');
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
            if (!res.ok) throw new Error('Failed to respond');
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
            if (!res.ok) throw new Error('Failed to cancel request');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
        },
    });

    const removeFriendMutation = useMutation({
        mutationFn: async (username: string) => {
            const res = await fetch(`http://localhost:3000/friends/${username}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to remove friend');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['friends'] });
            toast.success('Friend removed');
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
                throw new Error(data.message || 'Failed to create merge request');
            }
            return res.json();
        },
        onSuccess: () => {
            setMergeModalOpen(false);
            setSelectedExternalFriend(null);
            setSelectedMergeTarget(null);
            toast.success('Merge request sent!');
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
            if (!res.ok) throw new Error('Failed to respond');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receivedMergeRequests'] });
            queryClient.invalidateQueries({ queryKey: ['friends'] });
            setDetailsModalOpen(false);
            toast.success('Response sent');
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
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="p-8 space-y-8 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold">Friends</h1>

                <div className="grid gap-8 md:grid-cols-2">
                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Add Friend</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search by username..."
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
                                            {addFriendMutation.isPending ? 'Sending...' : 'Add'}
                                        </Button>
                                    </div>

                                    {showSuggestions && searchResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md">
                                            <ul className="py-1">
                                                {searchResults.map((user) => (
                                                    <li
                                                        key={user.username}
                                                        className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer flex justify-between items-center"
                                                        onClick={() => handleSelectUser(user.username)}
                                                    >
                                                        <span>{user.name}</span>
                                                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                {addError && <p className="text-red-500 mt-2 text-sm">{addError}</p>}
                            </CardContent>
                        </Card>

                        {/* Received Merge Requests */}
                        {receivedMergeRequests.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Merge Requests ({receivedMergeRequests.length})</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {receivedMergeRequests.map((req) => (
                                        <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                            <div>
                                                <p className="font-medium">From: {req.requester.name}</p>
                                                <p className="text-sm text-muted-foreground">Link with: {req.placeholderName}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedMergeRequest(req.id);
                                                    setDetailsModalOpen(true);
                                                }}
                                            >
                                                View Details
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {requests.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Pending Requests ({requests.length})</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {requests.map((req) => (
                                        <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                            <div>
                                                <p className="font-medium">{req.requester.name}</p>
                                                <p className="text-sm text-muted-foreground">@{req.requester.username}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => respondMutation.mutate({ id: req.id, status: 'ACCEPTED' })}
                                                >
                                                    Accept
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => respondMutation.mutate({ id: req.id, status: 'DECLINED' })}
                                                >
                                                    Decline
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {sentRequests.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Sent Requests ({sentRequests.length})</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {sentRequests.map((req) => (
                                        <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">{req.addressee.name}</p>
                                                    <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full font-medium">
                                                        Pending
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">@{req.addressee.username}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => cancelRequestMutation.mutate(req.id)}
                                                disabled={cancelRequestMutation.isPending}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>My Friends ({friends.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {friends.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>No friends yet.</p>
                                        <p className="text-sm">Search for users to add them!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {friends.map((friend) => (
                                            <div key={friend.username} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                                <div>
                                                    <p className="font-medium">{friend.name}</p>
                                                    <p className="text-sm text-muted-foreground">@{friend.username}</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setFriendToRemove(friend)}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* External Friends */}
                        <Card>
                            <CardHeader>
                                <CardTitle>External Friends ({externalFriends.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {externalFriends.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>No external friends.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {externalFriends.map((friend, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                                <div>
                                                    <p className="font-medium">{friend.name}</p>
                                                    <p className="text-sm text-muted-foreground">Ad-hoc participant</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedExternalFriend(friend.name);
                                                        setMergeModalOpen(true);
                                                    }}
                                                >
                                                    Link to User
                                                </Button>
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
                        <DialogTitle>Remove Friend</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <strong>{friendToRemove?.name}</strong> from your friends list?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFriendToRemove(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (friendToRemove) {
                                    removeFriendMutation.mutate(friendToRemove.username);
                                    setFriendToRemove(null);
                                }
                            }}
                        >
                            Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Merge Request Modal */}
            <Dialog open={mergeModalOpen} onOpenChange={setMergeModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Link External Friend</DialogTitle>
                        <DialogDescription>
                            Select a registered friend to link <strong>{selectedExternalFriend}</strong> to.
                            This will send a request to the user to accept the merge.
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
                        <Button variant="outline" onClick={() => setMergeModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => createMergeRequestMutation.mutate()}
                            disabled={!selectedMergeTarget || createMergeRequestMutation.isPending}
                        >
                            {createMergeRequestMutation.isPending ? 'Sending...' : 'Send Request'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Merge Details Modal */}
            <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Merge Request Details</DialogTitle>
                        <DialogDescription>
                            The following transactions will be linked to your account if you accept.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {mergeDetails?.map((tx) => (
                            <div key={tx.id} className="p-3 border rounded bg-card">
                                <div className="flex justify-between">
                                    <span className="font-medium">{tx.description || 'No description'}</span>
                                    <span>{new Date(tx.date).toLocaleDateString()}</span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    Total: R$ {Number(tx.amount).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => respondMergeMutation.mutate({ id: selectedMergeRequest!, status: 'REJECTED' })}>
                            Reject
                        </Button>
                        <Button onClick={() => respondMergeMutation.mutate({ id: selectedMergeRequest!, status: 'ACCEPTED' })}>
                            Accept
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
