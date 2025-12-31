'use client'

import { useRouter } from 'next/navigation'
import { Printer, Wallet, Database, Download, Trash2, ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'

interface LocalSystemPreferences {
    autoPrintReceipt: boolean
    openDrawerOnCash: boolean
    defaultPaymentMethod: string
    autoBackup: boolean
    backupFrequency: string
}

const DEFAULT_LOCAL_PREFS: LocalSystemPreferences = {
    autoPrintReceipt: true,
    openDrawerOnCash: true,
    defaultPaymentMethod: 'cash',
    autoBackup: false,
    backupFrequency: 'weekly'
}

export default function PreferencesPage() {
    const [mounted, setMounted] = useState(false)
    const router = useRouter()
    const [preferences, setPreferences] = useState<LocalSystemPreferences>(DEFAULT_LOCAL_PREFS)

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem('userPreferences')
        if (saved) {
            try {
                // We parse the entire object but only care about the keys relevant to this page
                // Ideally in the future we separate the storage keys
                const parsed = JSON.parse(saved)
                setPreferences({ ...DEFAULT_LOCAL_PREFS, ...parsed })
            } catch (e) {
                console.error('Error loading preferences:', e)
            }
        }
    }, [])

    const savePreferences = (newPrefs: Partial<LocalSystemPreferences>) => {
        const updated = { ...preferences, ...newPrefs }
        setPreferences(updated)
        // Merge with existing full object to not lose Profile settings
        const existing = localStorage.getItem('userPreferences')
        let fullObject = {}
        if (existing) {
            try {
                fullObject = JSON.parse(existing)
            } catch (e) { }
        }
        localStorage.setItem('userPreferences', JSON.stringify({ ...fullObject, ...updated }))
        toast.success('Configuración guardada')
    }

    const handleClearCache = () => {
        if (confirm('¿Estás seguro de que quieres limpiar la caché local? Esto reiniciará todas las preferencias.')) {
            localStorage.removeItem('userPreferences')
            setPreferences(DEFAULT_LOCAL_PREFS)
            toast.success('Caché limpiado correctamente')
        }
    }

    if (!mounted) {
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
                    title="Preferencias de Sistema Local"
                    subtitle="Configuración específica para este dispositivo y navegador"
                />
            </div>

            <div className="max-w-4xl space-y-6">

                {/* POS CONFIGURATION */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Printer className="h-5 w-5" />Configuración del Punto de Venta</CardTitle>
                        <CardDescription>Opciones para agilizar el proceso de ventas en este equipo</CardDescription>
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

                {/* DATA */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Datos Locales</CardTitle>
                        <CardDescription>Gestión de datos almacenados en el navegador</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <Label>Backup Automático de Sesión</Label>
                                <p className="text-sm text-gray-500">Guardar estado local para recuperación ante fallos</p>
                            </div>
                            <Switch checked={preferences.autoBackup} onCheckedChange={(checked) => savePreferences({ autoBackup: checked })} />
                        </div>
                        <Separator />
                        <div className="flex gap-3">
                            {/* Export moved to profile? No, this is raw data dump, keep here for tech support */}
                            <Button onClick={handleClearCache} variant="destructive" className="flex items-center gap-2">
                                <Trash2 className="h-4 w-4" />
                                Restaurar Preferencias Locales
                            </Button>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 text-sm">
                            <p><strong>Nota:</strong> Las preferencias de apariencia, idioma y notificaciones personales se han movido a <Link href="/dashboard/profile" className="text-blue-600 underline">Mi Perfil</Link>.</p>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
