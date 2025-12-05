'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun, Globe, Monitor, DollarSign, Calendar, Clock, Printer, Wallet, Bell, Volume2, Mail, Type, Maximize2, Zap, LayoutDashboard, PanelLeft, Eye, Keyboard, Database, Download, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface UserPreferences {
    language: string
    dateFormat: string
    timeFormat: string
    currency: string
    firstDayOfWeek: string
    autoPrintReceipt: boolean
    openDrawerOnCash: boolean
    defaultPaymentMethod: string
    desktopNotifications: boolean
    soundEnabled: boolean
    lowStockAlerts: boolean
    dailyEmailSummary: boolean
    fontSize: string
    density: string
    animationsEnabled: boolean
    sidebarDefault: string
    defaultPage: string
    highContrast: boolean
    reduceMotion: boolean
    keyboardFocus: boolean
    autoBackup: boolean
    backupFrequency: string
}

const DEFAULT_PREFERENCES: UserPreferences = {
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'MXN',
    firstDayOfWeek: 'monday',
    autoPrintReceipt: true,
    openDrawerOnCash: true,
    defaultPaymentMethod: 'cash',
    desktopNotifications: true,
    soundEnabled: true,
    lowStockAlerts: true,
    dailyEmailSummary: false,
    fontSize: 'normal',
    density: 'normal',
    animationsEnabled: true,
    sidebarDefault: 'expanded',
    defaultPage: 'dashboard',
    highContrast: false,
    reduceMotion: false,
    keyboardFocus: true,
    autoBackup: false,
    backupFrequency: 'weekly'
}

export default function PreferencesPage() {
    const [mounted, setMounted] = useState(false)
    const { theme, setTheme } = useTheme()
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem('userPreferences')
        if (saved) {
            try {
                setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(saved) })
            } catch (e) {
                console.error('Error loading preferences:', e)
            }
        }
    }, [])

    const savePreferences = (newPrefs: Partial<UserPreferences>) => {
        const updated = { ...preferences, ...newPrefs }
        setPreferences(updated)
        localStorage.setItem('userPreferences', JSON.stringify(updated))
        toast.success('Preferencias guardadas')
    }

    const handleExportData = () => {
        const dataStr = JSON.stringify(preferences, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `preferencias-${new Date().toISOString().split('T')[0]}.json`
        link.click()
        toast.success('Preferencias exportadas')
    }

    const handleClearCache = () => {
        if (confirm('¿Estás seguro de que quieres limpiar todas las preferencias?')) {
            localStorage.removeItem('userPreferences')
            setPreferences(DEFAULT_PREFERENCES)
            toast.success('Caché limpiado correctamente')
        }
    }

    if (!mounted) {
        return <div className="p-6">Cargando...</div>
    }

    const themeOptions = [
        { value: 'light', label: 'Claro', icon: Sun, description: 'Modo claro para el día' },
        { value: 'dark', label: 'Oscuro', icon: Moon, description: 'Modo oscuro para reducir la fatiga visual' },
        { value: 'system', label: 'Sistema', icon: Monitor, description: 'Usar preferencia del sistema operativo' }
    ]

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="Preferencias de Usuario"
                subtitle="Personaliza la apariencia, formato y comportamiento del sistema"
            />

            <div className="max-w-4xl space-y-6">
                {/* TEMA */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tema de Apariencia</CardTitle>
                        <CardDescription>Selecciona el tema para la interfaz</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {themeOptions.map((option) => {
                                const Icon = option.icon
                                const isSelected = theme === option.value
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => setTheme(option.value)}
                                        className={`p-4 rounded-lg border-2 transition-all ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        <div className="flex flex-col items-center space-y-2">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                <Icon className={`h-6 w-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                                            </div>
                                            <p className="font-semibold text-sm">{option.label}</p>
                                            <p className="text-xs text-gray-500">{option.description}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* REGIONAL SETTINGS - PHASE 1 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Configuración Regional</CardTitle>
                        <CardDescription>Idioma, formato de fecha, hora y moneda</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="language">Idioma del Sistema</Label>
                            <Select value={preferences.language} onValueChange={(value) => savePreferences({ language: value })}>
                                <SelectTrigger id="language" className="w-full md:w-[300px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="es">🇪🇸 Español</SelectItem>
                                    <SelectItem value="en">🇺🇸 English</SelectItem>
                                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="dateFormat" className="flex items-center gap-2"><Calendar className="h-4 w-4" />Formato de Fecha</Label>
                            <Select value={preferences.dateFormat} onValueChange={(value) => savePreferences({ dateFormat: value })}>
                                <SelectTrigger id="dateFormat" className="w-full md:w-[300px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (05/12/2025)</SelectItem>
                                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/05/2025)</SelectItem>
                                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2025-12-05)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="timeFormat" className="flex items-center gap-2"><Clock className="h-4 w-4" />Formato de Hora</Label>
                            <Select value={preferences.timeFormat} onValueChange={(value) => savePreferences({ timeFormat: value })}>
                                <SelectTrigger id="timeFormat" className="w-full md:w-[300px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12h">12 horas (3:45 PM)</SelectItem>
                                    <SelectItem value="24h">24 horas (15:45)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="currency" className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Moneda Predeterminada</Label>
                            <Select value={preferences.currency} onValueChange={(value) => savePreferences({ currency: value })}>
                                <SelectTrigger id="currency" className="w-full md:w-[300px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MXN">🇲🇽 Peso Mexicano (MXN)</SelectItem>
                                    <SelectItem value="USD">🇺🇸 Dólar Americano (USD)</SelectItem>
                                    <SelectItem value="EUR">🇪🇺 Euro (EUR)</SelectItem>
                                    <SelectItem value="GBP">🇬🇧 Libra Esterlina (GBP)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="firstDay">Primer Día de la Semana</Label>
                            <Select value={preferences.firstDayOfWeek} onValueChange={(value) => savePreferences({ firstDayOfWeek: value })}>
                                <SelectTrigger id="firstDay" className="w-full md:w-[300px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sunday">Domingo</SelectItem>
                                    <SelectItem value="monday">Lunes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* POS CONFIGURATION - PHASE 1 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Printer className="h-5 w-5" />Configuración del Punto de Venta</CardTitle>
                        <CardDescription>Opciones para agilizar el proceso de ventas</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Impresión Automática de Ticket</Label>
                                <p className="text-sm text-gray-500">Imprimir ticket automáticamente al completar una venta</p>
                            </div>
                            <Switch checked={preferences.autoPrintReceipt} onCheckedChange={(checked) => savePreferences({ autoPrintReceipt: checked })} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label className="flex items-center gap-2"><Wallet className="h-4 w-4" />Abrir Cajón al Cobrar en Efectivo</Label>
                                <p className="text-sm text-gray-500">Abrir el cajón automáticamente cuando el pago es en efectivo</p>
                            </div>
                            <Switch checked={preferences.openDrawerOnCash} onCheckedChange={(checked) => savePreferences({ openDrawerOnCash: checked })} />
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="paymentMethod">Método de Pago Predeterminado</Label>
                            <Select value={preferences.defaultPaymentMethod} onValueChange={(value) => savePreferences({ defaultPaymentMethod: value })}>
                                <SelectTrigger id="paymentMethod" className="w-full md:w-[300px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">💵 Efectivo</SelectItem>
                                    <SelectItem value="card">💳 Tarjeta</SelectItem>
                                    <SelectItem value="transfer">🏦 Transferencia</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-gray-500">Este método se seleccionará automáticamente al abrir el POS</p>
                        </div>
                    </CardContent>
                </Card>

                {/* NOTIFICATIONS - PHASE 1 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notificaciones</CardTitle>
                        <CardDescription>Controla qué notificaciones quieres recibir</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Notificaciones de Escritorio</Label>
                                <p className="text-sm text-gray-500">Mostrar notificaciones del navegador para eventos importantes</p>
                            </div>
                            <Switch checked={preferences.desktopNotifications} onCheckedChange={(checked) => savePreferences({ desktopNotifications: checked })} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label className="flex items-center gap-2"><Volume2 className="h-4 w-4" />Sonidos del Sistema</Label>
                                <p className="text-sm text-gray-500">Reproducir sonidos al completar ventas y otras acciones</p>
                            </div>
                            <Switch checked={preferences.soundEnabled} onCheckedChange={(checked) => savePreferences({ soundEnabled: checked })} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Alertas de Stock Bajo</Label>
                                <p className="text-sm text-gray-500">Notificar cuando los productos alcancen el punto de reorden</p>
                            </div>
                            <Switch checked={preferences.lowStockAlerts} onCheckedChange={(checked) => savePreferences({ lowStockAlerts: checked })} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label className="flex items-center gap-2"><Mail className="h-4 w-4" />Resumen Diario por Email</Label>
                                <p className="text-sm text-gray-500">Recibir un resumen de ventas e inventario cada día</p>
                            </div>
                            <Switch checked={preferences.dailyEmailSummary} onCheckedChange={(checked) => savePreferences({ dailyEmailSummary: checked })} />
                        </div>
                    </CardContent>
                </Card>


                {/* UI - PHASE 2 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Type className="h-5 w-5" />Personalización de Interfaz</CardTitle>
                        <CardDescription>Ajusta tamaño y densidad</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="fontSize">Tamaño de Fuente</Label>
                            <Select value={preferences.fontSize} onValueChange={(value) => savePreferences({ fontSize: value })}>
                                <SelectTrigger id="fontSize" className="w-full md:w-[300px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="small">Pequeño</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="large">Grande</SelectItem>
                                    <SelectItem value="xlarge">Extra Grande</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="density">Densidad</Label>
                            <Select value={preferences.density} onValueChange={(value) => savePreferences({ density: value })}>
                                <SelectTrigger id="density" className="w-full md:w-[300px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="compact">Compacta</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="comfortable">Espaciosa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Animaciones</Label>
                                <p className="text-sm text-gray-500">Habilitar animaciones</p>
                            </div>
                            <Switch checked={preferences.animationsEnabled} onCheckedChange={(checked) => savePreferences({ animationsEnabled: checked })} />
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="sidebarDefault">Sidebar</Label>
                            <Select value={preferences.sidebarDefault} onValueChange={(value) => savePreferences({ sidebarDefault: value })}>
                                <SelectTrigger id="sidebarDefault" className="w-full md:w-[300px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="collapsed">Colapsado</SelectItem>
                                    <SelectItem value="expanded">Expandido</SelectItem>
                                    <SelectItem value="auto">Automático</ SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="defaultPage">Página de Inicio</Label>
                            <Select value={preferences.defaultPage} onValueChange={(value) => savePreferences({ defaultPage: value })}>
                                <SelectTrigger id="defaultPage" className="w-full md:w-[300px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dashboard"> Dashboard</SelectItem>
                                    <SelectItem value="pos"> POS</SelectItem>
                                    <SelectItem value="inventory"> Inventario</SelectItem>
                                    <SelectItem value="sales"> Ventas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* ACCESSIBILITY - PHASE 3 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />Accesibilidad</CardTitle>
                        <CardDescription>Mejora la experiencia de uso</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Alto Contraste</Label>
                                <p className="text-sm text-gray-500">Mayor contraste para mejor legibilidad</p>
                            </div>
                            <Switch checked={preferences.highContrast} onCheckedChange={(checked) => savePreferences({ highContrast: checked })} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Reducir Movimiento</Label>
                                <p className="text-sm text-gray-500">Minimizar animaciones</p>
                            </div>
                            <Switch checked={preferences.reduceMotion} onCheckedChange={(checked) => savePreferences({ reduceMotion: checked })} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label className="flex items-center gap-2"><Keyboard className="h-4 w-4" />Focus de Teclado</Label>
                                <p className="text-sm text-gray-500">Resaltar elementos enfocados</p>
                            </div>
                            <Switch checked={preferences.keyboardFocus} onCheckedChange={(checked) => savePreferences({ keyboardFocus: checked })} />
                        </div>
                    </CardContent>
                </Card>

                {/* DATA - PHASE 3 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Datos y Sincronización</CardTitle>
                        <CardDescription>Gestiona tus datos</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Backup Automático</Label>
                                <p className="text-sm text-gray-500">Guardar copia de seguridad</p>
                            </div>
                            <Switch checked={preferences.autoBackup} onCheckedChange={(checked) => savePreferences({ autoBackup: checked })} />
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="backupFrequency">Frecuencia</Label>
                            <Select value={preferences.backupFrequency} onValueChange={(value) => savePreferences({ backupFrequency: value })} disabled={!preferences.autoBackup}>
                                <SelectTrigger id="backupFrequency" className="w-full md:w-[300px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Diario</SelectItem>
                                    <SelectItem value="weekly">Semanal</SelectItem>
                                    <SelectItem value="monthly">Mensual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Separator />
                        <div className="flex gap-3">
                            <Button onClick={handleExportData} variant="outline" className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                Export Preferencias
                            </Button>
                            <Button onClick={handleClearCache} variant="destructive" className="flex items-center gap-2">
                                <Trash2 className="h-4 w-4" />
                                Limpiar Caché
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
