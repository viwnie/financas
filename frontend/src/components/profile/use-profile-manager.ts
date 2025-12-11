import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

export function useProfileManager(open: boolean, setOpen: (open: boolean) => void) {
    const { user, login } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [showPasswordError, setShowPasswordError] = useState(false);
    const [hasDbAvatar, setHasDbAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        confirmNewPassword: '',
        currentPassword: '',
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
                confirmNewPassword: '',
                currentPassword: '',
                avatar: null,
                removeAvatar: false,
            });
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            setAvatarPreview(`${apiUrl}/users/${user.id}/avatar?t=${Date.now()}`);
            setHasDbAvatar(false);
            setShowPasswordError(false);
        }
    }, [user, open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setShowPasswordError(false);

        if (name === 'name') {
            if (!/^[a-zA-Z\u00C0-\u00FF ]*$/.test(value)) {
                return;
            }
        }

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

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${apiUrl}/users/check-username?username=${username}`, {
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
        setShowPasswordError(false);
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image must be less than 5MB');
                return;
            }
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
        setShowPasswordError(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRevertAvatar = () => {
        setFormData((prev) => ({ ...prev, avatar: null, removeAvatar: false }));
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        setAvatarPreview(`${apiUrl}/users/${user?.id}/avatar?t=${Date.now()}`);
        setShowPasswordError(false);
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
            if (formData.password) {
                if (formData.password !== formData.confirmNewPassword) {
                    toast.error('New passwords do not match');
                    setLoading(false);
                    return;
                }
                data.append('password', formData.password);
            }

            if (!formData.currentPassword) {
                toast.error('Current password is required to save changes');
                setShowPasswordError(true);
                setLoading(false);
                return;
            }
            data.append('currentPassword', formData.currentPassword);

            if (formData.avatar) data.append('avatar', formData.avatar);
            if (formData.removeAvatar) data.append('removeAvatar', 'true');

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${apiUrl}/users/me`, {
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

            const userForStore = {
                id: updatedUser.id,
                name: updatedUser.name,
                username: updatedUser.username,
                email: updatedUser.email
            };

            if (token) {
                login(userForStore, token);
            }

            toast.success('Profile updated successfully');
            setOpen(false);

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const hasChanges =
        formData.name !== user?.name ||
        formData.username !== user?.username ||
        formData.email !== user?.email ||
        formData.password !== '' ||
        formData.avatar !== null ||
        formData.removeAvatar;

    return {
        user,
        loading,
        checkingUsername,
        usernameAvailable,
        avatarPreview,
        showPasswordError,
        hasDbAvatar,
        setHasDbAvatar,
        fileInputRef,
        formData,
        handleChange,
        handleFileChange,
        handleRemoveAvatar,
        handleRevertAvatar,
        handleSubmit,
        hasChanges,
        setShowPasswordError,
    };
}
