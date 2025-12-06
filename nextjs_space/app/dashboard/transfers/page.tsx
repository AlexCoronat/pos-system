'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Package,
    ArrowLeftRight,
    Clock,
    CheckCircle,
    XCircle,
    Truck,
    PackageCheck,
    Filter,
    RefreshCw,
    Plus,
    AlertTriangle
} from 'lucide-react'
import { PageHeader, LoadingState, EmptyState, BrandButton, StatsCard } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { transferService } from '@/lib/services/transfer.service'
import { locationService } from '@/lib/services/location.service'
import type { TransferListItem, TransferStatus } from '@/lib/types/transfer'
import type { LocationListItem } from '@/lib/types/settings'
import { toast } from 'sonner'
import { TransferCard } from '@/components/transfers/TransferCard'
import { TransferDetailModal } from '@/components/transfers/TransferDetailModal'
import { CreateTransferModal } from '@/components/transfers/CreateTransferModal'

const STATUS_CONFIG: Record<TransferStatus, { label: string; color: string; icon: any }> = {
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    approved: { label: 'Aprobada', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-800', icon: XCircle },
    in_transit: { label: 'En Tránsito', color: 'bg-purple-100 text-purple-800', icon: Truck },
    received: { label: 'Recibida', color: 'bg-green-100 text-green-800', icon: PackageCheck },
    partially_received: { label: 'Parcial', color: 'bg-orange-100 text-orange-800', icon: Package },
    cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800', icon: XCircle },
    expired: { label: 'Expirada', color: 'bg-gray-100 text-gray-600', icon: Clock }
}

export default function TransfersPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('pending')
    const [transfers, setTransfers] = useState<TransferListItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [locations, setLocations] = useState<LocationListItem[]>([])
    const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>()

    // Modal states
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null)

    // Stats
    const [stats, setStats] = useState({
        pending: 0,
        inTransit: 0,
        toReceive: 0,
        completed: 0
    })

    const loadLocations = async () => {
        try {
            const locs = await locationService.getLocations()
            setLocations(locs)
            if (locs.length > 0 && !selectedLocationId) {
                setSelectedLocationId(locs[0].id)
            }
        } catch (error) {
            console.error('Error loading locations:', error)
        }
    }

    const loadTransfers = async () => {
        if (!selectedLocationId) return

        setIsLoading(true)
        try {
            let statusFilter: TransferStatus | TransferStatus[] | undefined

            switch (activeTab) {
                case 'pending':
                    statusFilter = 'pending'
                    break
                case 'outgoing':
                    statusFilter = ['approved', 'in_transit']
                    break
                case 'incoming':
                    statusFilter = 'in_transit'
                    break
                case 'history':
                    statusFilter = ['received', 'rejected', 'cancelled', 'expired', 'partially_received']
                    break
            }

            // Load transfers based on tab
            let data: TransferListItem[] = []

            if (activeTab === 'pending') {
                // Pending requests TO this location (we need to approve)
                data = await transferService.getTransfers({
                    fromLocationId: selectedLocationId,
                    status: 'pending'
                })
            } else if (activeTab === 'outgoing') {
                // Transfers FROM this location
                data = await transferService.getTransfers({
                    fromLocationId: selectedLocationId,
                    status: statusFilter
                })
            } else if (activeTab === 'incoming') {
                // Transfers TO this location
                data = await transferService.getTransfers({
                    toLocationId: selectedLocationId,
                    status: 'in_transit'
                })
            } else {
                // History - all for this location
                const outgoing = await transferService.getTransfers({
                    fromLocationId: selectedLocationId,
                    status: statusFilter
                })
                const incoming = await transferService.getTransfers({
                    toLocationId: selectedLocationId,
                    status: statusFilter
                })
                data = [...outgoing, ...incoming].sort((a, b) =>
                    new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
                )
            }

            setTransfers(data)

            // Load stats
            const pendingCount = await transferService.getTransfers({
                fromLocationId: selectedLocationId,
                status: 'pending'
            })
            const inTransitOut = await transferService.getTransfers({
                fromLocationId: selectedLocationId,
                status: 'in_transit'
            })
            const inTransitIn = await transferService.getTransfers({
                toLocationId: selectedLocationId,
                status: 'in_transit'
            })

            setStats({
                pending: pendingCount.length,
                inTransit: inTransitOut.length,
                toReceive: inTransitIn.length,
                completed: 0 // Could calculate from history
            })

        } catch (error: any) {
            console.error('Error loading transfers:', error)
            toast.error('Error al cargar transferencias')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadLocations()
    }, [])

    useEffect(() => {
        if (selectedLocationId) {
            loadTransfers()
        }
    }, [selectedLocationId, activeTab])

    const handleTransferClick = (transferId: number) => {
        setSelectedTransferId(transferId)
        setShowDetailModal(true)
    }

    const handleTransferUpdated = () => {
        loadTransfers()
        setShowDetailModal(false)
    }

    const handleCreateSuccess = () => {
        loadTransfers()
        setShowCreateModal(false)
        toast.success('Transferencia creada exitosamente')
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <PageHeader
                title="Transferencias"
                subtitle="Gestiona transferencias de inventario entre sucursales"
                actions={
                    <>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Sucursal:</span>
                            <Select
                                value={selectedLocationId?.toString() || ''}
                                onValueChange={(val) => setSelectedLocationId(parseInt(val))}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Seleccionar sucursal" />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations.map((loc) => (
                                        <SelectItem key={loc.id} value={loc.id.toString()}>
                                            {loc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <BrandButton onClick={() => setShowCreateModal(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Transferencia
                        </BrandButton>
                    </>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Solicitudes Pendientes"
                    value={stats.pending}
                    icon={Clock}
                    color="yellow"
                />
                <StatsCard
                    title="En Tránsito (Salida)"
                    value={stats.inTransit}
                    icon={Truck}
                    color="purple"
                />
                <StatsCard
                    title="Por Recibir"
                    value={stats.toReceive}
                    icon={PackageCheck}
                    color="blue"
                />
                <StatsCard
                    title="Completadas (Hoy)"
                    value={stats.completed}
                    icon={CheckCircle}
                    color="green"
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Solicitudes
                        {stats.pending > 0 && (
                            <Badge variant="destructive" className="ml-1">
                                {stats.pending}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="outgoing" className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        Salidas
                    </TabsTrigger>
                    <TabsTrigger value="incoming" className="flex items-center gap-2">
                        <PackageCheck className="h-4 w-4" />
                        Recepciones
                        {stats.toReceive > 0 && (
                            <Badge className="ml-1 bg-blue-100 text-blue-800">
                                {stats.toReceive}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Historial
                    </TabsTrigger>
                </TabsList>

                {/* Content for all tabs */}
                <TabsContent value={activeTab} className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>
                                {activeTab === 'pending' && 'Solicitudes Pendientes de Aprobación'}
                                {activeTab === 'outgoing' && 'Transferencias de Salida'}
                                {activeTab === 'incoming' && 'Transferencias por Recibir'}
                                {activeTab === 'history' && 'Historial de Transferencias'}
                            </CardTitle>
                            <BrandButton variant="outline" size="sm" onClick={loadTransfers}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Actualizar
                            </BrandButton>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <LoadingState message="Cargando transferencias..." />
                            ) : transfers.length === 0 ? (
                                <EmptyState
                                    icon={Package}
                                    title="Sin transferencias"
                                    description={
                                        activeTab === 'pending'
                                            ? 'No hay solicitudes pendientes de aprobación'
                                            : activeTab === 'incoming'
                                                ? 'No hay transferencias por recibir'
                                                : 'No hay transferencias en esta categoría'
                                    }
                                />
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {transfers.map((transfer) => (
                                        <TransferCard
                                            key={transfer.id}
                                            transfer={transfer}
                                            onClick={() => handleTransferClick(transfer.id)}
                                            showActions={activeTab === 'pending' || activeTab === 'incoming'}
                                            currentLocationId={selectedLocationId}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modals */}
            {showDetailModal && selectedTransferId && (
                <TransferDetailModal
                    transferId={selectedTransferId}
                    open={showDetailModal}
                    onOpenChange={setShowDetailModal}
                    onTransferUpdated={handleTransferUpdated}
                    currentLocationId={selectedLocationId}
                />
            )}

            {showCreateModal && (
                <CreateTransferModal
                    open={showCreateModal}
                    onOpenChange={setShowCreateModal}
                    onSuccess={handleCreateSuccess}
                    fromLocationId={selectedLocationId}
                />
            )}
        </div>
    )
}
