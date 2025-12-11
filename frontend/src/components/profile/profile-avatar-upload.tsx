import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X, Undo } from 'lucide-react';
import { MutableRefObject } from 'react';

interface ProfileAvatarUploadProps {
    fileInputRef: MutableRefObject<HTMLInputElement | null>;
    avatarPreview: string | null;
    formData: any;
    user: any;
    setHasDbAvatar: (val: boolean) => void;
    hasDbAvatar: boolean;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRevertAvatar: () => void;
    handleRemoveAvatar: () => void;
}

export function ProfileAvatarUpload({
    fileInputRef,
    avatarPreview,
    formData,
    user,
    setHasDbAvatar,
    hasDbAvatar,
    handleFileChange,
    handleRevertAvatar,
    handleRemoveAvatar,
}: ProfileAvatarUploadProps) {
    return (
        <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {avatarPreview ? (
                    <>
                        <AvatarImage
                            src={avatarPreview}
                            className="object-cover"
                            onLoad={() => {
                                if (!formData.avatar && !formData.removeAvatar) {
                                    setHasDbAvatar(true);
                                }
                            }}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (!formData.avatar && !formData.removeAvatar) {
                                    setHasDbAvatar(false);
                                }
                            }}
                        />
                        <AvatarFallback className="text-2xl">
                            {(formData.name || user?.name || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </>
                ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-2xl">
                        {(formData.name || user?.name || '?').charAt(0).toUpperCase()}
                    </div>
                )}
            </Avatar>
            <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Change Photo
                </Button>
                {(formData.avatar || formData.removeAvatar) ? (
                    <Button type="button" variant="outline" size="sm" onClick={handleRevertAvatar}>
                        <Undo className="mr-2 h-4 w-4" />
                        Reverter
                    </Button>
                ) : hasDbAvatar ? (
                    <Button type="button" variant="destructive" size="sm" onClick={handleRemoveAvatar}>
                        <X className="mr-2 h-4 w-4" />
                        Remover
                    </Button>
                ) : null}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,.heic"
                onChange={handleFileChange}
            />
        </div>
    );
}
