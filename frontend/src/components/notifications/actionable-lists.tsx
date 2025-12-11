import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface ActionableListProps {
    items: any[];
    onRespond?: (id: string, status: any) => void;
    onDismiss?: (id: string) => void;
    t: (key: string) => string;
}

export function FriendRequestList({ items, onRespond }: { items: any[], onRespond: (id: string, status: 'ACCEPTED' | 'DECLINED') => void }) {
    if (items.length === 0) return null;
    return (
        <>
            {items.map((req: any) => (
                <div key={req.id} className="p-4 bg-accent/50 mb-1 rounded-sm last:mb-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="text-sm">
                            <span className="font-medium">{req.requester.name}</span>
                            <p className="text-xs text-muted-foreground">@{req.requester.username} sent a friend request</p>
                        </div>
                        <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => onRespond(req.id, 'ACCEPTED')}>
                                <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => onRespond(req.id, 'DECLINED')}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}

export function TransactionInviteList({ items, onRespond, t }: { items: any[], onRespond: (id: string, status: 'ACCEPTED' | 'REJECTED') => void, t: (key: string) => string }) {
    if (items.length === 0) return null;
    return (
        <>
            {items.map((inv: any) => (
                <div key={inv.id} className="p-4 bg-accent/50 mb-1 rounded-sm last:mb-0">
                    <div className="flex flex-col gap-2">
                        <div className="text-sm">
                            <span className="font-medium">{inv.transaction.creator.name}</span> {t('notifications.invitedYou')}
                            <p className="font-medium mt-1">${parseFloat(inv.transaction.amount).toFixed(2)} - {inv.transaction.description || 'Expense'}</p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs border-green-500 text-green-500" onClick={() => onRespond(inv.id, 'ACCEPTED')}>
                                {t('notifications.accept')}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-red-500 text-red-500" onClick={() => onRespond(inv.id, 'REJECTED')}>
                                {t('notifications.reject')}
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}

export function DeclinedRequestList({ items, onDismiss }: { items: any[], onDismiss: (id: string) => void }) {
    if (items.length === 0) return null;
    return (
        <>
            {items.map((req: any) => (
                <div key={req.id} className="p-4 flex items-center justify-between">
                    <div className="text-sm">
                        <span className="font-medium">{req.addressee.name}</span> declined your request
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDismiss(req.id)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ))}
        </>
    );
}
