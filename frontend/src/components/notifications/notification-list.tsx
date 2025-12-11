import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PersistentNotification } from './use-notifications';

interface NotificationListProps {
    notifications: PersistentNotification[];
    onMarkAsRead: (id: string) => void;
    onDelete: (id: string) => void;
}

export function NotificationList({ notifications, onMarkAsRead, onDelete }: NotificationListProps) {
    if (notifications.length === 0) return null;

    return (
        <div className="divide-y">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`p-4 flex flex-col gap-2 ${notification.isRead ? 'bg-background' : 'bg-muted/30'}`}
                >
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {notification.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-2">
                                {formatDistanceToNow(new Date(notification.createdAt), {
                                    addSuffix: true,
                                    locale: ptBR,
                                })}
                            </p>
                        </div>
                        <div className="flex flex-col gap-1">
                            {!notification.isRead ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => onMarkAsRead(notification.id)}
                                    title="Mark as read"
                                >
                                    <Eye className="h-3 w-3" />
                                </Button>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground"
                                    disabled
                                    title="Read"
                                >
                                    <EyeOff className="h-3 w-3" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => onDelete(notification.id)}
                                title="Delete"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
