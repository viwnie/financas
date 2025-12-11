import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfilePasswordFieldsProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showPasswordError: boolean;
    setShowPasswordError: (val: boolean) => void;
}

export function ProfilePasswordFields({
    formData,
    handleChange,
    showPasswordError,
    setShowPasswordError,
}: ProfilePasswordFieldsProps) {
    return (
        <>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right whitespace-nowrap">
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
            {formData.password && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="confirmNewPassword" className="text-right whitespace-nowrap">
                        Confirm Password
                    </Label>
                    <Input
                        id="confirmNewPassword"
                        name="confirmNewPassword"
                        type="password"
                        placeholder="Re-enter new password"
                        value={formData.confirmNewPassword}
                        onChange={handleChange}
                        className="col-span-3"
                    />
                </div>
            )}
            <div className={`grid grid-cols-4 items-center gap-4 border-t pt-4 mt-4 ${showPasswordError && !formData.currentPassword ? "mb-6" : ""}`}>
                <Label htmlFor="currentPassword" className="text-right font-bold whitespace-nowrap">
                    Current Password
                </Label>
                <div className="col-span-3 relative">
                    <Input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        placeholder="Required to save changes"
                        value={formData.currentPassword}
                        onChange={(e) => {
                            handleChange(e);
                            if (e.target.value) setShowPasswordError(false);
                        }}
                        className={showPasswordError && !formData.currentPassword ? "border-red-300" : ""}
                    />
                    {showPasswordError && !formData.currentPassword && (
                        <p className="text-xs text-red-500 absolute -bottom-5 left-0">Please enter your current password to confirm changes.</p>
                    )}
                </div>
            </div>
        </>
    );
}
