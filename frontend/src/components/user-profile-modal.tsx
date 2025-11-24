'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Upload, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserProfileModalProps {
    children: React.ReactNode;
}

export function UserProfileModal({ children }: UserProfileModalProps) {
    const { user, login } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        avatar: null as File | null,
        removeAvatar: false,
    });

    useEffect(() => {
        if (user && open) {
            setFormData({
                name: user.name || '',
                username: user.username || '',
                email: user.email || '',
                password: '',
                avatar: null,
                removeAvatar: false,
            });
            // Construct avatar URL if user has one (assuming backend serves it at /users/:id/avatar)
            // We can use a timestamp to bust cache
            setAvatarPreview(`${process.env.NEXT_PUBLIC_API_URL}/users/${user.id}/avatar?t=${Date.now()}`);
        }
    }, [user, open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === 'username') {
            setUsernameAvailable(null);
            if (value && value !== user?.username) {
                checkUsername(value);
            }
        }
    };

    const checkUsername = async (username: string) => {
        setCheckingUsername(true);
        try {
            const token = document.cookie
                .split('; ')
                .find((row) => row.startsWith('token='))
                ?.split('=')[1];

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/check-username?username=${username}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            setUsernameAvailable(data.available);
        } catch (error) {
            console.error('Error checking username:', error);
        } finally {
            setCheckingUsername(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image must be less than 5MB');
                return;
            }
            // Basic mime type check
            if (!file.type.startsWith('image/') && !file.name.endsWith('.heic')) {
                toast.error('Only image files are allowed');
                return;
            }

            setFormData((prev) => ({ ...prev, avatar: file, removeAvatar: false }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveAvatar = () => {
        setFormData((prev) => ({ ...prev, avatar: null, removeAvatar: true }));
        setAvatarPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = document.cookie
                .split('; ')
                .find((row) => row.startsWith('token='))
                ?.split('=')[1];

            const data = new FormData();
            if (formData.name !== user?.name) data.append('name', formData.name);
            if (formData.username !== user?.username) data.append('username', formData.username);
            if (formData.email !== user?.email) data.append('email', formData.email);
            if (formData.password) data.append('password', formData.password);
            if (formData.avatar) data.append('avatar', formData.avatar);
            if (formData.removeAvatar) data.append('removeAvatar', 'true');

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: data,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to update profile');
            }

            const updatedUser = await res.json();

            // Update local user state
            // We need to construct the user object as expected by the store
            // Assuming the response returns the full user object
            // We might need to refresh the token if critical info changed, but for now just update store
            // Re-login to update store (or create a specific update action in store)
            // Since login takes the user object directly in the current implementation (based on auth.service.ts login response structure), 
            // we might need to be careful. The backend `update` returns the user.
            // Let's assume we can just merge it.

            // Actually, useAuthStore.getState().login might expect the full login response { access_token, user }.
            // But here we just have the user. We should probably just update the user part.
            // Since I can't see the store implementation details fully, I'll assume I can just reload the page or rely on a fetchUser if it exists.
            // But `login` usually sets the user.

            // Let's try to manually update the user in the store if possible, or just reload.
            // Reloading is safer to get fresh state.

            window.location.reload();

            toast.success('Profile updated successfully');
            setOpen(false);

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Make changes to your profile here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <AvatarImage src={avatarPreview || ''} className="object-cover" onError={(e) => { e.currentTarget.src = '' }} />
                            <AvatarFallback className="text-2xl">{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                Change Photo
                            </Button>
                            {(avatarPreview) && (
                                <Button type="button" variant="destructive" size="sm" onClick={handleRemoveAvatar}>
                                    <X className="mr-2 h-4 w-4" />
                                    Remove
                                </Button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,.heic"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="username" className="text-right">
                            Username
                        </Label>
                        <div className="col-span-3 relative">
                            <Input
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className={usernameAvailable === false ? "border-red-500" : usernameAvailable === true ? "border-green-500" : ""}
                            />
                            {checkingUsername && (
                                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            {!checkingUsername && usernameAvailable === true && formData.username !== user?.username && (
                                <span className="text-xs text-green-500 absolute -bottom-5 left-0 flex items-center">
                                    <Check className="w-3 h-3 mr-1" /> Available
                                </span>
                            )}
                            {!checkingUsername && usernameAvailable === false && (
                                <span className="text-xs text-red-500 absolute -bottom-5 left-0 flex items-center">
                                    <AlertCircle className="w-3 h-3 mr-1" /> Not Available
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4 mt-2">
                        <Label htmlFor="email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">
                            Password
                        </Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Leave blank to keep current"
                            value={formData.password}
                            onChange={handleChange}
                            className="col-span-3"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading || usernameAvailable === false}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
