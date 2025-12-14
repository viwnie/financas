import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Clock, Plus, X } from 'lucide-react';
import { UseFormRegister } from 'react-hook-form';
import { TransactionFormValues } from './use-transaction-form';
import { useLanguage } from '@/contexts/language-context';
import { getInitials } from '@/lib/utils';

interface TransactionParticipantsProps {
    isShared: boolean;
    fields: any[];
    friendSearch: string;
    setFriendSearch: (val: string) => void;
    filteredResults: any[];
    handleAddFriend: (friend: any) => void;
    handleAddAdHoc: () => void;
    addFriendMutation: any;
    handleReinvite: (index: number) => void;
    handleRemoveParticipant: (index: number) => void;
    handleSplitChange: (index: number, field: 'amount' | 'percent', value: string) => void;
    register: UseFormRegister<TransactionFormValues>;
    transactionId?: string;
}

export function TransactionParticipants({
    isShared,
    fields,
    friendSearch,
    setFriendSearch,
    filteredResults,
    handleAddFriend,
    handleAddAdHoc,
    addFriendMutation,
    handleReinvite,
    handleRemoveParticipant,
    handleSplitChange,
    register,
    transactionId,
}: TransactionParticipantsProps) {
    const { t } = useLanguage();

    if (!isShared) return null;

    return (
        <div className="space-y-4 border p-4 rounded-md bg-muted/20">
            <div className="space-y-2">
                <Label>{t('transactions.addParticipants')}</Label>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('transactions.searchFriendsPlaceholder')}
                        value={friendSearch}
                        onChange={(e) => setFriendSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>

                {friendSearch && (
                    <div className="border rounded-md bg-background p-2 shadow-sm max-h-[200px] overflow-y-auto mt-2">
                        {filteredResults.map((result: any) => (
                            <div
                                key={result.id || result.name}
                                className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer rounded"
                                onClick={() => {
                                    if (result.type === 'FRIEND' || result.type === 'EXTERNAL') {
                                        handleAddFriend(result);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage
                                            src={result.username ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/avatar/${result.username}` : undefined}
                                            alt={result.name}
                                            className="object-cover"
                                        />
                                        <AvatarFallback>{getInitials(result.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{result.name}</span>
                                        {result.username && <span className="text-xs text-muted-foreground">@{result.username}</span>}
                                    </div>
                                    {result.type === 'FRIEND' && <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">{t('transactions.friend')}</span>}
                                    {result.type === 'EXTERNAL' && <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">{t('transactions.external')}</span>}
                                </div>

                                {
                                    result.type === 'GLOBAL' && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 px-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addFriendMutation.mutate(result.username);
                                            }}
                                        >
                                            <UserPlus className="h-4 w-4 mr-1" />
                                            {t('transactions.addFriendButton')}
                                        </Button>
                                    )
                                }

                                {
                                    result.type === 'PENDING' && (
                                        <span className="flex items-center text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {t('transactions.requestSent')}
                                        </span>
                                    )
                                }

                                {(result.type === 'FRIEND' || result.type === 'EXTERNAL') && (
                                    <Plus className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                        ))}

                        <div
                            className="p-2 hover:bg-muted cursor-pointer rounded flex items-center gap-2 text-muted-foreground border-t mt-1"
                            onClick={handleAddAdHoc}
                        >
                            <Plus className="h-4 w-4" />
                            {t('transactions.add')} "{friendSearch}" {t('transactions.nonRegistered')}
                        </div>
                    </div>
                )}
            </div>

            {
                fields.length > 0 && (
                    <div className="space-y-3">
                        <Label>{t('transactions.selectedParticipants')}</Label>
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-3 bg-background p-3 rounded border">
                                <div className="flex-1 font-medium flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage
                                            src={field.hasAvatar && field.username ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/avatar/${field.username}` : undefined}
                                            alt={field.name}
                                            className="object-cover"
                                        />
                                        <AvatarFallback>{getInitials(field.name || '')}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        {field.name}
                                        {!field.username && !field.userId && <span className="ml-2 text-xs text-muted-foreground">({t('transactions.external')})</span>}
                                        {field.status === 'PENDING' && transactionId && <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-1 rounded">{t('transactions.pending')}</span>}
                                        {field.status === 'REJECTED' && <span className="ml-2 text-xs text-red-600 bg-red-100 px-1 rounded">{t('transactions.rejected')}</span>}
                                    </div>
                                </div>

                                {field.status === 'REJECTED' ? (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleReinvite(index)}
                                            className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8"
                                        >
                                            {t('transactions.reinvite')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRemoveParticipant(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-[100px]">
                                            <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">R$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                className="pl-6 h-9"
                                                {...register(`participants.${index}.amount`)}
                                                onChange={(e) => handleSplitChange(index, 'amount', e.target.value)}
                                            />
                                        </div>
                                        <div className="relative w-[80px]">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="%"
                                                className="pr-6 h-9"
                                                {...register(`participants.${index}.percent`)}
                                                onChange={(e) => handleSplitChange(index, 'percent', e.target.value)}
                                            />
                                            <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">%</span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRemoveParticipant(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
}
