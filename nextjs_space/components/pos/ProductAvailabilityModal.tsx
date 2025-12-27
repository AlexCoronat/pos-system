/**
 * Product Availability Modal
 * Shows stock availability across all branches for a product
 * Stepper flow optimized to fit without scrolling
 */

'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Package, AlertTriangle, Check, ArrowRight, ArrowLeft, Send, Loader2 } from 'lucide-react'
import { inventoryService } from '@/lib/services/inventory.service'
import { transferService } from '@/lib/services/transfer.service'
import { toast } from 'sonner'
import { useEscapeKey } from '@/lib/hooks/use-keyboard-shortcuts'

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

type Step = 'select' | 'confirm'

export function ProductAvailabilityModal({
    isOpen,
    onClose,
    product,
    currentLocationId,
    onTransferRequested
}: ProductAvailabilityModalProps) {
    const [availability, setAvailability] = useState<LocationStock[]>([])
    const [loading, setLoading] = useState(false)
    const [currentStep, setCurrentStep] = useState<Step>('select')
    const [selectedLocation, setSelectedLocation] = useState<LocationStock | null>(null)
    const [requestQuantity, setRequestQuantity] = useState(1)
    const [requestNotes, setRequestNotes] = useState('')
    const [isRequesting, setIsRequesting] = useState(false)

    useEscapeKey(() => {
        if (isOpen && !isRequesting) handleClose()
    }, isOpen)

    useEffect(() => {
        if (isOpen && product) {
            loadAvailability()
            setCurrentStep('select')
            setSelectedLocation(null)
            setRequestQuantity(1)
            setRequestNotes('')
        }
    }, [isOpen, product])

    const loadAvailability = async () => {
        if (!product) return
        setLoading(true)
        try {
            const data = await inventoryService.getProductAvailabilityAcrossLocations(product.id)
            const filtered = data
                .filter(loc => loc.locationId !== currentLocationId)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 4) // Max 4 locations to fit without scroll
            setAvailability(filtered)
        } catch {
            toast.error('Error al cargar disponibilidad')
        } finally {
            setLoading(false)
        }
    }

    const handleSelectLocation = (location: LocationStock) => {
        setSelectedLocation(location)
        setRequestQuantity(1)
        setCurrentStep('confirm')
    }

    const handleBack = () => {
        setCurrentStep('select')
        setSelectedLocation(null)
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
                priority: 'urgent',
                requestNotes: requestNotes || `Solicitud POS: ${product.name}`,
                items: [{ productId: product.id, quantityRequested: requestQuantity }]
            })
            toast.success('Solicitud de transferencia enviada', {
                description: `${requestQuantity} unidades de ${selectedLocation.locationName}`
            })
            handleClose()
            onTransferRequested?.()
        } catch (error: any) {
            toast.error(error.message || 'Error al crear la solicitud')
        } finally {
            setIsRequesting(false)
        }
    }

    const handleClose = () => {
        if (!isRequesting) {
            onClose()
            setCurrentStep('select')
            setSelectedLocation(null)
        }
    }

    if (!isOpen || !product) return null

    const totalStock = availability.reduce((sum, loc) => sum + loc.quantity, 0)

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-xl shadow-2xl">
                {/* Header */}
                <div className="px-5 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
                    <div className="flex items-center gap-3 min-w-0">
                        <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0">
                            <h2 className="font-bold text-gray-900 truncate">{product.name}</h2>
                            {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
                        </div>
                    </div>
                    <button onClick={handleClose} disabled={isRequesting} className="p-1.5 hover:bg-white/60 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stepper */}
                <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-center gap-6">
                    <div className={`flex items-center gap-2 ${currentStep === 'select' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 'select' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                            }`}>1</div>
                        <span className="text-sm font-medium">Sucursal</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                    <div className={`flex items-center gap-2 ${currentStep === 'confirm' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 'confirm' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                            }`}>2</div>
                        <span className="text-sm font-medium">Confirmar</span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5">
                    {loading ? (
                        <div className="py-10 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                            <p className="text-sm text-gray-500 mt-2">Buscando...</p>
                        </div>
                    ) : currentStep === 'select' ? (
                        availability.length === 0 ? (
                            <div className="py-10 text-center">
                                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-gray-600 font-medium">Sin stock en otras sucursales</p>
                            </div>
                        ) : (
                            <>
                                {/* Summary Badge */}
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                                    <span className="text-sm text-green-700">Disponible en otras sucursales:</span>
                                    <span className="text-xl font-bold text-green-600">{totalStock} uds</span>
                                </div>

                                {/* Location List - Compact */}
                                <div className="space-y-2">
                                    {availability.map((loc) => (
                                        <button
                                            key={loc.locationId}
                                            onClick={() => handleSelectLocation(loc)}
                                            className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${loc.isLowStock ? 'bg-amber-100' : 'bg-green-100'
                                                    }`}>
                                                    {loc.isLowStock ? (
                                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                    ) : (
                                                        <Check className="w-4 h-4 text-green-600" />
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-800">{loc.locationName}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-lg font-bold ${loc.isLowStock ? 'text-amber-600' : 'text-green-600'}`}>
                                                    {loc.quantity}
                                                </span>
                                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )
                    ) : selectedLocation && (
                        /* Step 2: Confirm */
                        <div className="space-y-4">
                            {/* Transfer Flow */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Desde</p>
                                    <p className="font-semibold text-blue-700">{selectedLocation.locationName}</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-400" />
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">A</p>
                                    <p className="font-semibold text-green-700">Tu sucursal</p>
                                </div>
                            </div>

                            {/* Quantity */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">Cantidad:</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setRequestQuantity(Math.max(1, requestQuantity - 1))}
                                        className="w-8 h-8 rounded border flex items-center justify-center hover:bg-gray-100"
                                    >-</button>
                                    <input
                                        type="number"
                                        min={1}
                                        max={selectedLocation.quantity}
                                        value={requestQuantity}
                                        onChange={(e) => setRequestQuantity(parseInt(e.target.value) || 1)}
                                        className="w-16 text-center border rounded py-1 font-bold"
                                    />
                                    <button
                                        onClick={() => setRequestQuantity(Math.min(selectedLocation.quantity, requestQuantity + 1))}
                                        className="w-8 h-8 rounded border flex items-center justify-center hover:bg-gray-100"
                                    >+</button>
                                    <span className="text-sm text-gray-500">de {selectedLocation.quantity}</span>
                                </div>
                            </div>

                            {/* Notes */}
                            <input
                                type="text"
                                placeholder="Notas opcionales..."
                                value={requestNotes}
                                onChange={(e) => setRequestNotes(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t bg-gray-50 flex justify-between rounded-b-xl">
                    {currentStep === 'confirm' ? (
                        <>
                            <button
                                onClick={handleBack}
                                disabled={isRequesting}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg flex items-center gap-1"
                            >
                                <ArrowLeft className="w-4 h-4" /> Atrás
                            </button>
                            <button
                                onClick={handleSubmitRequest}
                                disabled={isRequesting || requestQuantity < 1}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isRequesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {isRequesting ? 'Enviando...' : 'Solicitar'}
                            </button>
                        </>
                    ) : (
                        <>
                            <div />
                            <button onClick={handleClose} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                                Cerrar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
