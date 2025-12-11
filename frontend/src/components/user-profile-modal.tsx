'use client';

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useProfileManager } from './profile/use-profile-manager';
import { ProfileAvatarUpload } from './profile/profile-avatar-upload';
import { ProfileFormFields } from './profile/profile-form-fields';
import { ProfilePasswordFields } from './profile/profile-password-fields';

interface UserProfileModalProps {
    children: React.ReactNode;
}

export function UserProfileModal({ children }: UserProfileModalProps) {
    const [open, setOpen] = useState(false);
    const {
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
    } = useProfileManager(open, setOpen);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Make changes to your profile here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <ProfileAvatarUpload
                        fileInputRef={fileInputRef}
                        avatarPreview={avatarPreview}
                        formData={formData}
                        user={user}
                        setHasDbAvatar={setHasDbAvatar}
                        hasDbAvatar={hasDbAvatar}
                        handleFileChange={handleFileChange}
                        handleRevertAvatar={handleRevertAvatar}
                        handleRemoveAvatar={handleRemoveAvatar}
                    />

                    <ProfileFormFields
                        formData={formData}
                        handleChange={handleChange}
                        user={user}
                        checkingUsername={checkingUsername}
                        usernameAvailable={usernameAvailable}
                    />

                    {hasChanges && (
                        <ProfilePasswordFields
                            formData={formData}
                            handleChange={handleChange}
                            showPasswordError={showPasswordError}
                            setShowPasswordError={setShowPasswordError}
                        />
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={loading || usernameAvailable === false || !hasChanges}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
