'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Bell, Save, AlertCircle, ArrowLeft } from 'lucide-react'
import { alertService } from '@/lib/services/alert.service'
import type { NotificationPreferences } from '@/lib/types/notification'
import { toast } from 'sonner'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import type { Notification } from '@/lib/types/notification'

export default function NotificationsPage() {
    const router = useRouter()
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [prefs, notifs] = await Promise.all([
                alertService.getPreferences(),
                alertService.getNotifications({ limit: 20 })
            ])
            setPreferences(prefs)
            setNotifications(notifs)
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Error al cargar las preferencias')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!preferences) return

        setSaving(true)
        try {
            await alertService.updatePreferences(preferences)
            toast.success('Preferencias guardadas correctamente')
        } catch (error) {
            console.error('Error saving preferences:', error)
            toast.error('Error al guardar las preferencias')
        } finally {
            setSaving(false)
        }
    }

    const handleMarkAsRead = async (id: number) => {
        try {
            await alertService.markAsRead(id)
            await loadData()
            toast.success('Notificación marcada como leída')
        } catch (error) {
            toast.error('Error al marcar como leída')
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await alertService.deleteNotification(id)
            await loadData()
            toast.success('Notificación eliminada')
        } catch (error) {
            toast.error('Error al eliminar notificación')
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            await alertService.markAllAsRead()
            await loadData()
            toast.success('Todas las notificaciones marcadas como leídas')
        } catch (error) {
            toast.error('Error al marcar todas como leídas')
        }
    }

    if (loading) {
        return <div className="p-6">Cargando...</div>
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard/settings')}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <PageHeader
                    title="Notificaciones"
                    subtitle="Configura las alertas y notificaciones del sistema"
                />
            </div>

            <div className="max-w-4xl space-y-6">
                {/* Notification Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Configuración de Notificaciones
                        </CardTitle>
                        <CardDescription>
                            Estas configuraciones aplican a todo el negocio
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Desktop Notifications */}
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Notificaciones de Escritorio</Label>
                                <p className="text-sm text-gray-500">Mostrar notificaciones del navegador</p>
                            </div>
                            <Switch
                                checked={preferences?.desktop_notifications ?? true}
                                onCheckedChange={(checked) =>
                                    setPreferences(prev => prev ? { ...prev, desktop_notifications: checked } : null)
                                }
                            />
                        </div>

                        <Separator />

                        {/* Sound */}
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Sonidos del Sistema</Label>
                                <p className="text-sm text-gray-500">Reproducir sonidos para alertas</p>
                            </div>
                            <Switch
                                checked={preferences?.sound_enabled ?? true}
                                onCheckedChange={(checked) =>
                                    setPreferences(prev => prev ? { ...prev, sound_enabled: checked } : null)
                                }
                            />
                        </div>

                        <Separator />

                        {/* Low Stock Alerts */}
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Alertas de Stock Bajo</Label>
                                <p className="text-sm text-gray-500">Notificar cuando los productos alcancen su punto de reorden</p>
                            </div>
                            <Switch
                                checked={preferences?.low_stock_alerts ?? true}
                                onCheckedChange={(checked) =>
                                    setPreferences(prev => prev ? { ...prev, low_stock_alerts: checked } : null)
                                }
                            />
                        </div>

                        <Separator />

                        {/* Sales Notifications */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label>Notificaciones de Ventas Grandes</Label>
                                    <p className="text-sm text-gray-500">Alertar cuando una venta supere cierto monto</p>
                                </div>
                                <Switch
                                    checked={preferences?.sales_notifications ?? true}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => prev ? { ...prev, sales_notifications: checked } : null)
                                    }
                                />
                            </div>

                            {preferences?.sales_notifications && (
                                <div className="ml-4 space-y-2">
                                    <Label htmlFor="saleThreshold">Monto Mínimo</Label>
                                    <Input
                                        id="saleThreshold"
                                        type="number"
                                        min={0}
                                        step={100}
                                        value={preferences.sales_amount_threshold}
                                        onChange={(e) =>
                                            setPreferences(prev => prev ? { ...prev, sales_amount_threshold: Number(e.target.value) } : null)
                                        }
                                        className="w-40"
                                    />
                                    <p className="text-xs text-gray-500">Ejemplo: $1000.00</p>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Daily Email Summary */}
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Resumen Diario por Email</Label>
                                <p className="text-sm text-gray-500">Recibir un resumen de ventas e inventario cada día</p>
                            </div>
                            <Switch
                                checked={preferences?.daily_email_summary ?? false}
                                onCheckedChange={(checked) =>
                                    setPreferences(prev => prev ? { ...prev, daily_email_summary: checked } : null)
                                }
                            />
                        </div>

                        {/* Save Button */}
                        <div className="pt-4">
                            <Button onClick={handleSave} disabled={saving || !preferences}>
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? 'Guardando...' : 'Guardar Preferencias'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Notifications */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Notificaciones Recientes</CardTitle>
                                <CardDescription>Últimas 20 notificaciones</CardDescription>
                            </div>
                            {notifications.some(n => !n.read) && (
                                <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                                    Marcar todas como leídas
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {notifications.length === 0 ? (
                            <div className="text-center py-12">
                                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">No hay notificaciones</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {notifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onMarkAsRead={handleMarkAsRead}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
