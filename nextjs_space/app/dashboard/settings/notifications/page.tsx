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
import { Bell, Save, AlertCircle, ArrowLeft, User, Info } from 'lucide-react'
import { alertService } from '@/lib/services/alert.service'
import type { NotificationPreferences } from '@/lib/types/notification'
import { toast } from 'sonner'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import type { Notification } from '@/lib/types/notification'
import Link from 'next/link'

export default function NotificationsSettingsPage() {
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
            toast.success('Reglas de notificación guardadas')
        } catch (error) {
            console.error('Error saving preferences:', error)
            toast.error('Error al guardar las reglas')
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
                    title="Reglas de Notificación del Negocio"
                    subtitle="Configura qué eventos generan alertas en el sistema"
                />
            </div>

            <div className="max-w-4xl space-y-6">

                {/* Navigation Hint */}
                <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">¿Buscas sonidos o popups?</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            La configuración personal de sonido y notificaciones de escritorio se ha movido a tu <Link href="/dashboard/profile" className="underline font-medium hover:text-blue-900">Perfil de Usuario</Link>.
                            Esta página controla las reglas globales del negocio.
                        </p>
                    </div>
                </div>

                {/* Business Notification Rules */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Disparadores de Alertas
                        </CardTitle>
                        <CardDescription>
                            Define cuándo el sistema debe generar una notificación para el equipo
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Low Stock Alerts */}
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Generar Alertas de Stock Bajo</Label>
                                <p className="text-sm text-gray-500">El sistema creará una alerta cuando un producto alcance su punto de reorden</p>
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
                                    <Label>Alertar sobre Ventas Grandes</Label>
                                    <p className="text-sm text-gray-500">Generar notificación especial al superar cierto monto</p>
                                </div>
                                <Switch
                                    checked={preferences?.sales_notifications ?? true}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => prev ? { ...prev, sales_notifications: checked } : null)
                                    }
                                />
                            </div>

                            {preferences?.sales_notifications && (
                                <div className="ml-4 space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                                    <Label htmlFor="saleThreshold">Monto Mínimo para Alerta</Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">$</span>
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
                                    </div>
                                    <p className="text-xs text-gray-500">Las ventas superiores a este monto notificarán a los administradores.</p>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Daily Email Summary */}
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Reporte Diario por Email</Label>
                                <p className="text-sm text-gray-500">Enviar resumen automático al cierre del día al email del negocio</p>
                            </div>
                            <Switch
                                checked={preferences?.daily_email_summary ?? false}
                                onCheckedChange={(checked) =>
                                    setPreferences(prev => prev ? { ...prev, daily_email_summary: checked } : null)
                                }
                            />
                        </div>

                        {/* Save Button */}
                        <div className="pt-4 flex justify-end">
                            <Button onClick={handleSave} disabled={saving || !preferences}>
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? 'Guardando...' : 'Guardar Reglas'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Notifications (Context aware) */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Historial de Alertas Generadas</CardTitle>
                                <CardDescription>Registro de las últimas alertas del sistema</CardDescription>
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
                                <p className="text-gray-500">No hay notificaciones recientes</p>
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
