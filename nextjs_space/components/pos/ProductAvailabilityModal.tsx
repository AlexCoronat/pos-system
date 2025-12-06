/**
 * Product Availability Modal
 * Shows stock availability across all branches for a product
 * Allows requesting transfers from other locations
 */

'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Package, AlertTriangle, Check, ArrowRight, Send } from 'lucide-react'
import { inventoryService } from '@/lib/services/inventory.service'
import { transferService } from '@/lib/services/transfer.service'
import { toast } from 'sonner'
import { useEscapeKey } from '@/lib/hooks/use-keyboard-shortcuts'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ProductAvailabilityModalProps {
    isOpen: boolean
    onClose: () => void
    product: {
        id: number
        name: string
        sku?: string
    } | null
    currentLocationId?: number
    onTransferRequested?: () => void
}

interface LocationStock {
    locationId: number
    locationName: string
    locationCode: string
    quantity: number
    reorderPoint: number
    isLowStock: boolean
}

export function ProductAvailabilityModal({
    isOpen,
    onClose,
    product,
    currentLocationId,
    onTransferRequested
}: ProductAvailabilityModalProps) {
    const [availability, setAvailability] = useState<LocationStock[]>([])
    const [loading, setLoading] = useState(false)

    // Transfer request state
    const [showRequestModal, setShowRequestModal] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState<LocationStock | null>(null)
    const [requestQuantity, setRequestQuantity] = useState(1)
    const [requestNotes, setRequestNotes] = useState('')
    const [isRequesting, setIsRequesting] = useState(false)

    useEscapeKey(() => {
        if (isOpen && !showRequestModal) {
            onClose()
        }
    }, isOpen)

    useEffect(() => {
        if (isOpen && product) {
            loadAvailability()
        }
    }, [isOpen, product])

    const loadAvailability = async () => {
        if (!product) return

        setLoading(true)
        try {
            const data = await inventoryService.getProductAvailabilityAcrossLocations(product.id)
            // Sort by quantity descending, but put current location first
            const sorted = data.sort((a, b) => {
                if (a.locationId === currentLocationId) return -1
                if (b.locationId === currentLocationId) return 1
                return b.quantity - a.quantity
            })
            setAvailability(sorted)
        } catch (error) {
            console.error('Error loading availability:', error)
            toast.error('Error al cargar disponibilidad')
        } finally {
            setLoading(false)
        }
    }

    const handleRequestClick = (location: LocationStock) => {
        setSelectedLocation(location)
        setRequestQuantity(Math.min(1, location.quantity))
        setRequestNotes('')
        setShowRequestModal(true)
    }

    const handleSubmitRequest = async () => {
        if (!product || !selectedLocation || !currentLocationId) return

        if (requestQuantity <= 0 || requestQuantity > selectedLocation.quantity) {
            toast.error('Cantidad inválida')
            return
        }

        setIsRequesting(true)
        try {
            await transferService.createTransfer({
                fromLocationId: selectedLocation.locationId,
                toLocationId: currentLocationId,
                transferType: 'pos_request',
                priority: 'normal',
                requestNotes: requestNotes || `Solicitud desde POS para ${product.name}`,
                items: [{
                    productId: product.id,
                    quantityRequested: requestQuantity
                }]
            })

            toast.success('Solicitud de transferencia enviada', {
                description: `Se solicitaron ${requestQuantity} unidades de ${selectedLocation.locationName}`
            })

            setShowRequestModal(false)
            onTransferRequested?.()
        } catch (error: any) {
            toast.error(error.message || 'Error al crear la solicitud')
        } finally {
            setIsRequesting(false)
        }
    }

    if (!isOpen || !product) return null

    const totalStock = availability.reduce((sum, loc) => sum + loc.quantity, 0)
    const otherLocationsStock = availability
        .filter(loc => loc.locationId !== currentLocationId)
        .reduce((sum, loc) => sum + loc.quantity, 0)

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-blue-600" />
                                Disponibilidad en Sucursales
                            </h2>
                            <div className="mt-1">
                                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                {product.sku && (
                                    <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {loading ? (
                            <div className="py-8 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                                <p className="text-sm text-gray-600">Buscando disponibilidad...</p>
                            </div>
                        ) : availability.length === 0 ? (
                            <div className="py-8 text-center">
                                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-gray-600 font-medium">Sin stock disponible</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Este producto no tiene existencias en ninguna sucursal
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Summary */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <p className="text-xs text-gray-600">Stock Total</p>
                                            <p className="text-2xl font-bold text-blue-700">{totalStock}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">Otras Sucursales</p>
                                            <p className="text-2xl font-bold text-green-600">{otherLocationsStock}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Location List */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                        Detalle por Sucursal
                                    </h3>
                                    {availability.map((loc) => {
                                        const isCurrentLocation = loc.locationId === currentLocationId
                                        const canRequest = !isCurrentLocation && loc.quantity > 0

                                        return (
                                            <div
                                                key={loc.locationId}
                                                className={`flex items-center justify-between p-3 rounded-lg border ${isCurrentLocation
                                                    ? 'bg-gray-100 border-gray-300'
                                                    : 'bg-white border-gray-200'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${loc.isLowStock
                                                        ? 'bg-amber-100'
                                                        : 'bg-green-100'
                                                        }`}>
                                                        {loc.isLowStock ? (
                                                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                                                        ) : (
                                                            <Check className="w-5 h-5 text-green-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {loc.locationName}
                                                            {isCurrentLocation && (
                                                                <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                                                    Actual
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{loc.locationCode}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className={`text-xl font-bold ${loc.isLowStock ? 'text-amber-600' : 'text-green-600'
                                                            }`}>
                                                            {loc.quantity}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            unidades
                                                        </p>
                                                    </div>
                                                    {canRequest && (
                                                        <button
                                                            onClick={() => handleRequestClick(loc)}
                                                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                                                        >
                                                            <Send className="w-3 h-3" />
                                                            Solicitar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t bg-gray-50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>

            {/* Transfer Request Modal */}
            <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRight className="w-5 h-5 text-blue-600" />
                            Solicitar Transferencia
                        </DialogTitle>
                    </DialogHeader>

                    {selectedLocation && product && (
                        <div className="space-y-4">
                            {/* Product info */}
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium">{product.name}</p>
                                {product.sku && (
                                    <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                )}
                            </div>

                            {/* Transfer info */}
                            <div className="flex items-center justify-center gap-3 text-sm">
                                <div className="text-center p-2 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Desde</p>
                                    <p className="font-medium text-blue-700">{selectedLocation.locationName}</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-400" />
                                <div className="text-center p-2 bg-green-50 rounded-lg">
                                    <p className="text-xs text-gray-500">A tu sucursal</p>
                                    <p className="font-medium text-green-700">Actual</p>
                                </div>
                            </div>

                            {/* Quantity */}
                            <div className="space-y-2">
                                <Label>Cantidad a solicitar</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={1}
                                        max={selectedLocation.quantity}
                                        value={requestQuantity}
                                        onChange={(e) => setRequestQuantity(parseInt(e.target.value) || 1)}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-gray-500">
                                        de {selectedLocation.quantity} disponibles
                                    </span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label>Notas (opcional)</Label>
                                <Textarea
                                    placeholder="Ej: Para venta pendiente cliente..."
                                    value={requestNotes}
                                    onChange={(e) => setRequestNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            {/* Info */}
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                <p>La solicitud será enviada a {selectedLocation.locationName} para su aprobación.</p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <button
                            onClick={() => setShowRequestModal(false)}
                            disabled={isRequesting}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmitRequest}
                            disabled={isRequesting || requestQuantity <= 0}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isRequesting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Enviar Solicitud
                                </>
                            )}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

