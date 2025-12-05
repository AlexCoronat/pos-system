import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertCircle, DollarSign, Info, Package, X } from 'lucide-react'
import type { Notification, NotificationType } from '@/lib/types/notification'
import { cn } from '@/lib/utils'

interface NotificationItemProps {
    notification: Notification
    onMarkAsRead?: (id: number) => void
    onDelete?: (id: number) => void
}

const typeConfig: Record<NotificationType, { icon: any; color: string; bgColor: string }> = {
    stock_alert: {
        icon: Package,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-950'
    },
    sales: {
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950'
    },
    system: {
        icon: AlertCircle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950'
    },
    info: {
        icon: Info,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 dark:bg-gray-950'
    }
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
    const config = typeConfig[notification.type]
    const Icon = config.icon

    const handleClick = () => {
        if (!notification.read && onMarkAsRead) {
            onMarkAsRead(notification.id)
        }
    }

    const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
        addSuffix: true,
        locale: es
    })

    return (
        <div
            className={cn(
                'p-4 rounded-lg border transition-all hover:shadow-sm cursor-pointer',
                notification.read
                    ? 'bg-white dark:bg-gray-900 border-gray-200'
                    : 'bg-blue-50 dark:bg-blue-950 border-blue-200',
                config.bgColor
            )}
            onClick={handleClick}
        >
            <div className="flex gap-3">
                {/* Icon */}
                <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    config.bgColor
                )}>
                    <Icon className={cn('h-5 w-5', config.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {notification.message}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                            {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" title="No leído" />
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDelete(notification.id)
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                    title="Eliminar"
                                >
                                    <X className="h-4 w-4 text-gray-500" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">{timeAgo}</span>
                        {notification.location_id && (
                            <span className="text-xs text-gray-500">• Sucursal específica</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
