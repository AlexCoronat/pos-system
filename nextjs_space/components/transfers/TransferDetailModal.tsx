'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { BrandButton, LoadingState } from '@/components/shared'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Clock,
    Truck,
    CheckCircle,
    XCircle,
    Package,
    MapPin,
    User,
    Calendar,
    AlertTriangle
} from 'lucide-react'
import { transferService } from '@/lib/services/transfer.service'
import type { Transfer, TransferStatus } from '@/lib/types/transfer'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_CONFIG: Record<TransferStatus, { label: string; color: string }> = {
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Aprobada', color: 'bg-blue-100 text-blue-800' },
    rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-800' },
    in_transit: { label: 'En Tránsito', color: 'bg-purple-100 text-purple-800' },
    received: { label: 'Recibida', color: 'bg-green-100 text-green-800' },
    partially_received: { label: 'Parcial', color: 'bg-orange-100 text-orange-800' },
    cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
    expired: { label: 'Expirada', color: 'bg-gray-100 text-gray-600' }
}

interface TransferDetailModalProps {
    transferId: number
    open: boolean
    onOpenChange: (open: boolean) => void
    onTransferUpdated: () => void
    currentLocationId?: number
}

export function TransferDetailModal({
    transferId,
    open,
    onOpenChange,
    onTransferUpdated,
    currentLocationId
}: TransferDetailModalProps) {
    const [transfer, setTransfer] = useState<Transfer | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)

    // Action states
    const [rejectionReason, setRejectionReason] = useState('')
    const [shippingNotes, setShippingNotes] = useState('')
    const [receivingNotes, setReceivingNotes] = useState('')
    const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({})

    const loadTransfer = async () => {
        setIsLoading(true)
        try {
            const data = await transferService.getTransferById(transferId)
            setTransfer(data)

            // Initialize quantities
            if (data?.items) {
                const quantities: Record<number, number> = {}
                data.items.forEach(item => {
                    quantities[item.id!] = item.quantityRequested
                })
                setItemQuantities(quantities)
            }
        } catch (error: any) {
            toast.error('Error al cargar la transferencia')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (open && transferId) {
            loadTransfer()
        }
    }, [open, transferId])

    const handleApprove = async () => {
        if (!transfer) return
        setIsProcessing(true)
        try {
            await transferService.approveTransfer(transfer.id, {
                items: transfer.items?.map(item => ({
                    itemId: item.id!,
                    quantityApproved: itemQuantities[item.id!] || item.quantityRequested
                })) || []
            })
            toast.success('Transferencia aprobada')
            onTransferUpdated()
        } catch (error: any) {
            toast.error(error.message || 'Error al aprobar')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleReject = async () => {
        if (!transfer || !rejectionReason) {
            toast.error('Ingresa un motivo de rechazo')
            return
        }
        setIsProcessing(true)
        try {
            await transferService.rejectTransfer(transfer.id, rejectionReason)
            toast.success('Transferencia rechazada')
            onTransferUpdated()
        } catch (error: any) {
            toast.error(error.message || 'Error al rechazar')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleShip = async () => {
        if (!transfer) return
        setIsProcessing(true)
        try {
            await transferService.shipTransfer(transfer.id, {
                items: transfer.items?.map(item => ({
                    itemId: item.id!,
                    quantityShipped: item.quantityApproved || itemQuantities[item.id!]
                })) || [],
                shippingNotes
            })
            toast.success('Transferencia enviada')
            onTransferUpdated()
        } catch (error: any) {
            toast.error(error.message || 'Error al enviar')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleReceive = async () => {
        if (!transfer) return
        setIsProcessing(true)
        try {
            await transferService.receiveTransfer(transfer.id, {
                items: transfer.items?.map(item => ({
                    itemId: item.id!,
                    quantityReceived: itemQuantities[item.id!] || item.quantityShipped
                })) || [],
                receivingNotes
            })
            toast.success('Transferencia recibida')
            onTransferUpdated()
        } catch (error: any) {
            toast.error(error.message || 'Error al recibir')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleCancel = async () => {
        if (!transfer) return
        setIsProcessing(true)
        try {
            await transferService.cancelTransfer(transfer.id)
            toast.success('Transferencia cancelada')
            onTransferUpdated()
        } catch (error: any) {
            toast.error(error.message || 'Error al cancelar')
        } finally {
            setIsProcessing(false)
        }
    }

    // Determine available actions based on status and current location
    const canApprove = transfer?.status === 'pending' && transfer?.fromLocationId === currentLocationId
    const canShip = transfer?.status === 'approved' && transfer?.fromLocationId === currentLocationId
    const canReceive = transfer?.status === 'in_transit' && transfer?.toLocationId === currentLocationId
    const canCancel = ['pending', 'approved'].includes(transfer?.status || '')

    if (isLoading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Detalle de Transferencia</DialogTitle>
                        <DialogDescription>Cargando información de la transferencia</DialogDescription>
                    </DialogHeader>
                    <LoadingState message="Cargando transferencia..." />
                </DialogContent>
            </Dialog>
        )
    }

    if (!transfer) return null

    const statusConfig = STATUS_CONFIG[transfer.status]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <span className="font-mono">{transfer.transferNumber}</span>
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                        {transfer.priority === 'urgent' && (
                            <Badge variant="destructive">URGENTE</Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Transferencia de {transfer.fromLocationName} a {transfer.toLocationName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Transfer Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-red-500" />
                                <span className="text-sm text-muted-foreground">Origen:</span>
                                <span className="font-medium">{transfer.fromLocationName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-green-500" />
                                <span className="text-sm text-muted-foreground">Destino:</span>
                                <span className="font-medium">{transfer.toLocationName}</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Solicitado por:</span>
                                <span className="font-medium">{transfer.requestedByName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Fecha:</span>
                                <span className="font-medium">
                                    {format(new Date(transfer.requestedAt), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Expiration warning */}
                    {transfer.status === 'pending' && transfer.expiresAt && (
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <span className="text-sm text-yellow-800">
                                Expira: {format(new Date(transfer.expiresAt), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                            </span>
                        </div>
                    )}

                    {/* Notes */}
                    {transfer.requestNotes && (
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Notas de solicitud:</p>
                            <p className="text-sm">{transfer.requestNotes}</p>
                        </div>
                    )}

                    {transfer.rejectionReason && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-sm text-red-600 mb-1">Motivo de rechazo:</p>
                            <p className="text-sm text-red-800">{transfer.rejectionReason}</p>
                        </div>
                    )}

                    {/* Items Table */}
                    <div>
                        <h4 className="font-medium mb-3">Productos</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Solicitado</TableHead>
                                    {transfer.status !== 'pending' && (
                                        <TableHead className="text-right">Aprobado</TableHead>
                                    )}
                                    {['in_transit', 'received', 'partially_received'].includes(transfer.status) && (
                                        <TableHead className="text-right">Enviado</TableHead>
                                    )}
                                    {['received', 'partially_received'].includes(transfer.status) && (
                                        <TableHead className="text-right">Recibido</TableHead>
                                    )}
                                    {(canApprove || canReceive) && (
                                        <TableHead className="text-right">Cantidad</TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transfer.items?.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{item.productName}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    SKU: {item.productSku}
                                                    {item.variantName && ` • ${item.variantName}`}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{item.quantityRequested}</TableCell>
                                        {transfer.status !== 'pending' && (
                                            <TableCell className="text-right">{item.quantityApproved}</TableCell>
                                        )}
                                        {['in_transit', 'received', 'partially_received'].includes(transfer.status) && (
                                            <TableCell className="text-right">{item.quantityShipped}</TableCell>
                                        )}
                                        {['received', 'partially_received'].includes(transfer.status) && (
                                            <TableCell className="text-right">{item.quantityReceived}</TableCell>
                                        )}
                                        {(canApprove || canReceive) && (
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={canApprove ? item.quantityRequested : item.quantityShipped}
                                                    value={itemQuantities[item.id!] || 0}
                                                    onChange={(e) => setItemQuantities({
                                                        ...itemQuantities,
                                                        [item.id!]: parseInt(e.target.value) || 0
                                                    })}
                                                    className="w-20 text-right"
                                                />
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Action inputs */}
                    {canApprove && (
                        <div className="space-y-3">
                            <Label>Motivo de rechazo (si aplica)</Label>
                            <Textarea
                                placeholder="Ingresa el motivo si vas a rechazar..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                        </div>
                    )}

                    {canShip && (
                        <div className="space-y-3">
                            <Label>Notas de envío (opcional)</Label>
                            <Textarea
                                placeholder="Notas sobre el envío..."
                                value={shippingNotes}
                                onChange={(e) => setShippingNotes(e.target.value)}
                            />
                        </div>
                    )}

                    {canReceive && (
                        <div className="space-y-3">
                            <Label>Notas de recepción (opcional)</Label>
                            <Textarea
                                placeholder="Notas sobre la recepción..."
                                value={receivingNotes}
                                onChange={(e) => setReceivingNotes(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2 mt-4">
                    {canCancel && (
                        <BrandButton
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isProcessing}
                        >
                            Cancelar Transferencia
                        </BrandButton>
                    )}

                    {canApprove && (
                        <>
                            <BrandButton
                                variant="outline"
                                onClick={handleReject}
                                disabled={isProcessing || !rejectionReason}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rechazar
                            </BrandButton>
                            <BrandButton
                                onClick={handleApprove}
                                disabled={isProcessing}
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aprobar
                            </BrandButton>
                        </>
                    )}

                    {canShip && (
                        <BrandButton
                            onClick={handleShip}
                            disabled={isProcessing}
                        >
                            <Truck className="h-4 w-4 mr-2" />
                            Enviar
                        </BrandButton>
                    )}

                    {canReceive && (
                        <BrandButton
                            onClick={handleReceive}
                            disabled={isProcessing}
                        >
                            <Package className="h-4 w-4 mr-2" />
                            Confirmar Recepción
                        </BrandButton>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
