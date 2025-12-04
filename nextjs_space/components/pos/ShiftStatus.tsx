/**
 * Shift Status Widget
 * Displays current shift information in POS
 */

'use client'

import { useEffect } from 'react'
import { Clock, TrendingUp, Wallet } from 'lucide-react'
import { useShiftStore } from '@/lib/stores/shift-store'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { BrandButton } from '@/components/shared'

interface ShiftStatusProps {
    onOpenShift: () => void
    onCloseShift: () => void
    onAddMovement: () => void
}

export function ShiftStatus({ onOpenShift, onCloseShift, onAddMovement }: ShiftStatusProps) {
    const { currentShift, loadCurrentShift, isLoading } = useShiftStore()

    useEffect(() => {
        loadCurrentShift()
    }, [loadCurrentShift])

    if (isLoading) {
        return (
            <div className="bg-gray-100 rounded-lg p-3 animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-24"></div>
            </div>
        )
    }

    if (!currentShift) {
        return (
            <BrandButton
                onClick={onOpenShift}
                variant="outline"
                className="flex items-center gap-2"
            >
                <Clock className="w-4 h-4" />
                <span className="font-medium">Abrir Turno</span>
            </BrandButton>
        )
    }

    const openedAgo = formatDistanceToNow(new Date(currentShift.opened_at), {
        addSuffix: true,
        locale: es
    })

    return (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                        <div className="text-xs text-gray-600">Turno Activo</div>
                        <div className="font-semibold text-gray-900">{currentShift.shift_number}</div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs text-gray-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {openedAgo}
                        </div>
                        {currentShift.summary?.sales_count !== undefined && (
                            <div className="text-xs text-gray-600 flex items-center gap-1 justify-end">
                                <TrendingUp className="w-3 h-3" />
                                {currentShift.summary.sales_count} ventas
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <BrandButton
                            onClick={onAddMovement}
                            size="sm"
                            className="flex items-center gap-1"
                            title="Registrar movimiento de efectivo"
                        >
                            <Wallet className="w-4 h-4" />
                            Movimiento
                        </BrandButton>

                        <BrandButton
                            onClick={onCloseShift}
                            variant="secondary"
                            size="sm"
                        >
                            Cerrar Turno
                        </BrandButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
