'use client'

import { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import Link from 'next/link'
import { alertService } from '@/lib/services/alert.service'
import type { Notification } from '@/lib/types/notification'
import { NotificationItem } from './NotificationItem'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)

    const loadNotifications = async () => {
        try {
            const [notifs, count] = await Promise.all([
                alertService.getNotifications({ limit: 5, read: false }),
                alertService.getUnreadCount()
            ])
            setNotifications(notifs)
            setUnreadCount(count)
        } catch (error) {
            console.error('Error loading notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadNotifications()

        // Poll for new notifications every 30 seconds
        const interval = setInterval(loadNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleMarkAsRead = async (id: number) => {
        try {
            await alertService.markAsRead(id)
            await loadNotifications()
            toast.success('Notificación marcada como leída')
        } catch (error) {
            toast.error('Error al marcar como leída')
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            await alertService.markAllAsRead()
            await loadNotifications()
            toast.success('Todas las notificaciones marcadas como leídas')
        } catch (error) {
            toast.error('Error al marcar todas como leídas')
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500  text-white text-xs rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-96 p-0">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold">Notificaciones</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="h-8 text-xs"
                        >
                            <Check className="h-3 w-3 mr-1" />
                            Marcar todas
                        </Button>
                    )}
                </div>

                {/* Notifications List */}
                <div className="max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">
                            Cargando...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No hay notificaciones nuevas</p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-2">
                            {notifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onMarkAsRead={handleMarkAsRead}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2 border-t">
                    <Link href="/dashboard/settings/notifications" className="block">
                        <Button variant="ghost" className="w-full justify-center">
                            Ver todas las notificaciones
                        </Button>
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
