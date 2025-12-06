'use client'

import { Clock, Truck, CheckCircle, XCircle, Package, AlertTriangle, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BrandButton } from '@/components/shared'
import type { TransferListItem, TransferStatus } from '@/lib/types/transfer'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_CONFIG: Record<TransferStatus, { label: string; color: string; icon: any }> = {
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    approved: { label: 'Aprobada', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-800', icon: XCircle },
    in_transit: { label: 'En Tránsito', color: 'bg-purple-100 text-purple-800', icon: Truck },
    received: { label: 'Recibida', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    partially_received: { label: 'Parcial', color: 'bg-orange-100 text-orange-800', icon: Package },
    cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800', icon: XCircle },
    expired: { label: 'Expirada', color: 'bg-gray-100 text-gray-600', icon: Clock }
}

interface TransferCardProps {
    transfer: TransferListItem
    onClick: () => void
    showActions?: boolean
    currentLocationId?: number
}

export function TransferCard({ transfer, onClick, showActions, currentLocationId }: TransferCardProps) {
    const statusConfig = STATUS_CONFIG[transfer.status]
    const StatusIcon = statusConfig.icon

    const isExpiringSoon = transfer.expiresAt &&
        new Date(transfer.expiresAt).getTime() - Date.now() < 2 * 60 * 60 * 1000 // Less than 2 hours

    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
            style={{
                borderLeftColor: transfer.priority === 'urgent' ? '#ef4444' :
                    transfer.status === 'pending' ? '#eab308' :
                        transfer.status === 'in_transit' ? '#a855f7' : '#e5e7eb'
            }}
            onClick={onClick}
        >
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                            {transfer.transferNumber}
                        </span>
                        {transfer.priority === 'urgent' && (
                            <Badge variant="destructive" className="text-xs">
                                URGENTE
                            </Badge>
                        )}
                    </div>
                    <Badge className={statusConfig.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                    </Badge>
                </div>

                {/* Locations */}
                <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-red-500" />
                        <span className="text-muted-foreground">De:</span>
                        <span className="font-medium">{transfer.fromLocationName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">A:</span>
                        <span className="font-medium">{transfer.toLocationName}</span>
                    </div>
                </div>

                {/* Items summary */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>{transfer.itemCount} producto{transfer.itemCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div>
                        {transfer.totalQuantity} unidades
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        Solicitado {formatDistanceToNow(new Date(transfer.requestedAt), {
                            addSuffix: true,
                            locale: es
                        })}
                    </span>

                    {isExpiringSoon && transfer.status === 'pending' && (
                        <div className="flex items-center gap-1 text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Por expirar</span>
                        </div>
                    )}
                </div>

                {/* Requested by */}
                <div className="text-xs text-muted-foreground mt-2">
                    Por: {transfer.requestedByName}
                </div>
            </CardContent>
        </Card>
    )
}
