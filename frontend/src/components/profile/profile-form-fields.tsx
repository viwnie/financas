import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, AlertCircle } from 'lucide-react';

interface ProfileFormFieldsProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    user: any;
    checkingUsername: boolean;
    usernameAvailable: boolean | null;
}

export function ProfileFormFields({
    formData,
    handleChange,
    user,
    checkingUsername,
    usernameAvailable,
}: ProfileFormFieldsProps) {
    return (
        <>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right whitespace-nowrap">
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
                <Label htmlFor="username" className="text-right whitespace-nowrap">
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
                <Label htmlFor="email" className="text-right whitespace-nowrap">
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
        </>
    );
}
