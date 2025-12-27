'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Clock,
    ToggleLeft,
    DollarSign,
    Calculator,
    Timer,
    RotateCcw,
    Loader2,
    Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useShiftConfigStore } from '@/lib/stores/shift-config-store'
import { toast } from 'sonner'

const DURATION_OPTIONS = [
    { value: 4, label: '4 horas' },
    { value: 6, label: '6 horas' },
    { value: 8, label: '8 horas (estándar)' },
    { value: 10, label: '10 horas' },
    { value: 12, label: '12 horas' },
    { value: 24, label: '24 horas' }
]

export default function ShiftConfigPage() {
    const router = useRouter()
    const {
        config,
        isLoading,
        loadConfig,
        toggleShiftsEnabled,
        toggleAutoCloseShift,
        toggleRequireOpeningAmount,
        toggleRequireClosingCount,
        setShiftDuration,
        resetToDefaults
    } = useShiftConfigStore()

    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        loadConfig()
    }, [loadConfig])

    const handleToggle = async (toggleFn: () => Promise<void>, name: string) => {
        setIsSaving(true)
        try {
            await toggleFn()
            toast.success(`${name} actualizado`)
        } catch (error) {
            toast.error('Error al guardar configuración')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDurationChange = async (value: string) => {
        setIsSaving(true)
        try {
            await setShiftDuration(parseInt(value))
            toast.success('Duración de turno actualizada')
        } catch (error) {
            toast.error('Error al guardar configuración')
        } finally {
            setIsSaving(false)
        }
    }

    const handleReset = async () => {
        setIsSaving(true)
        try {
            await resetToDefaults()
            toast.success('Configuración restablecida')
        } catch (error) {
            toast.error('Error al restablecer configuración')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/dashboard/settings')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Configuración de Turnos
                        </h1>
                        <p className="text-sm text-gray-500">
                            Configura cómo funcionan los turnos en el punto de venta
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl space-y-6">
                {/* Main Toggle */}
                <Card className="border-2">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${config.shiftsEnabled
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    <ToggleLeft className="h-7 w-7" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        Manejo de Turnos
                                    </h3>
                                    <p className="text-muted-foreground">
                                        {config.shiftsEnabled
                                            ? 'Los usuarios deben abrir un turno para usar el POS'
                                            : 'El POS funciona libremente sin requerir turno'}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={config.shiftsEnabled}
                                onCheckedChange={() => handleToggle(toggleShiftsEnabled, 'Manejo de turnos')}
                                disabled={isSaving}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Info Alert */}
                {!config.shiftsEnabled && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Con el manejo de turnos <strong>deshabilitado</strong>, los usuarios podrán
                            realizar ventas sin necesidad de abrir un turno. Los reportes de caja
                            no estarán disponibles.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Detailed Settings - Only shown when shifts are enabled */}
                {config.shiftsEnabled && (
                    <>
                        {/* Duration */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Duración del Turno
                                </CardTitle>
                                <CardDescription>
                                    Define la duración estándar de un turno de trabajo
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Select
                                        value={config.shiftDurationHours.toString()}
                                        onValueChange={handleDurationChange}
                                        disabled={isSaving}
                                    >
                                        <SelectTrigger className="w-[250px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DURATION_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value.toString()}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Auto-close toggle */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Timer className="h-5 w-5 text-orange-500" />
                                        <div>
                                            <Label className="font-medium">Cierre automático</Label>
                                            <p className="text-sm text-gray-500">
                                                Cerrar turno automáticamente al cumplirse la duración
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={config.autoCloseShift}
                                        onCheckedChange={() => handleToggle(toggleAutoCloseShift, 'Cierre automático')}
                                        disabled={isSaving}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Opening/Closing Requirements */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calculator className="h-5 w-5" />
                                    Requisitos de Apertura y Cierre
                                </CardTitle>
                                <CardDescription>
                                    Configura qué información se requiere al abrir y cerrar turnos
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Require opening amount */}
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <DollarSign className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <Label className="font-medium">Monto inicial de caja</Label>
                                            <p className="text-sm text-gray-500">
                                                Requerir ingresar el monto con el que se abre el turno
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={config.requireOpeningAmount}
                                        onCheckedChange={() => handleToggle(toggleRequireOpeningAmount, 'Monto inicial')}
                                        disabled={isSaving}
                                    />
                                </div>

                                {/* Require closing count */}
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Calculator className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <Label className="font-medium">Conteo de caja al cerrar</Label>
                                            <p className="text-sm text-gray-500">
                                                Requerir conteo de efectivo al cerrar el turno
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={config.requireClosingCount}
                                        onCheckedChange={() => handleToggle(toggleRequireClosingCount, 'Conteo al cerrar')}
                                        disabled={isSaving}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Reset Button */}
                <div className="flex justify-end">
                    <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restablecer valores por defecto
                    </Button>
                </div>
            </div>
        </div>
    )
}
