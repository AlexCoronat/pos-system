'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { BrandButton, LoadingState } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Package, AlertTriangle, Search } from 'lucide-react'
import { transferService } from '@/lib/services/transfer.service'
import { locationService } from '@/lib/services/location.service'
import { productService } from '@/lib/services/product.service'
import { inventoryService } from '@/lib/services/inventory.service'
import type { LocationListItem } from '@/lib/types/settings'
import type { ProductWithPrice } from '@/lib/types/product'
import { toast } from 'sonner'

interface CreateTransferModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    fromLocationId?: number
}

interface TransferItemInput {
    productId: number
    productName: string
    productSku: string
    variantId?: number | null
    variantName?: string
    quantityRequested: number
    availableStock: number
}

export function CreateTransferModal({
    open,
    onOpenChange,
    onSuccess,
    fromLocationId
}: CreateTransferModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [locations, setLocations] = useState<LocationListItem[]>([])

    // Form state
    const [toLocationId, setToLocationId] = useState<number | undefined>()
    const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
    const [requestNotes, setRequestNotes] = useState('')
    const [items, setItems] = useState<TransferItemInput[]>([])

    // Product search
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState<ProductWithPrice[]>([])
    const [isSearching, setIsSearching] = useState(false)

    const loadLocations = async () => {
        try {
            const locs = await locationService.getLocations()
            // Filter out the source location
            setLocations(locs.filter(l => l.id !== fromLocationId))
        } catch (error) {
            console.error('Error loading locations:', error)
        }
    }

    useEffect(() => {
        if (open) {
            loadLocations()
            setItems([])
            setToLocationId(undefined)
            setRequestNotes('')
            setPriority('normal')
        }
    }, [open, fromLocationId])

    const handleSearch = async () => {
        if (!searchTerm || searchTerm.length < 2) return

        setIsSearching(true)
        try {
            const response = await productService.getProducts({
                searchTerm,
                isActive: true
            }, 1, 10)
            setSearchResults(response.products)
        } catch (error) {
            console.error('Error searching products:', error)
        } finally {
            setIsSearching(false)
        }
    }

    const handleAddProduct = async (product: ProductWithPrice) => {
        // Check if already added
        if (items.some(i => i.productId === product.id)) {
            toast.error('Este producto ya está en la lista')
            return
        }

        // Get available stock at destination location
        let availableStock = 0
        if (toLocationId) {
            try {
                const inventory = await inventoryService.getInventoryByProduct(product.id, toLocationId)
                availableStock = inventory?.quantity || 0
            } catch (error) {
                console.error('Error getting inventory:', error)
            }
        }

        setItems([...items, {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            variantId: null,
            quantityRequested: 1,
            availableStock
        }])

        setSearchTerm('')
        setSearchResults([])
    }

    const handleRemoveItem = (productId: number) => {
        setItems(items.filter(i => i.productId !== productId))
    }

    const handleQuantityChange = (productId: number, quantity: number) => {
        setItems(items.map(item =>
            item.productId === productId
                ? { ...item, quantityRequested: Math.max(1, quantity) }
                : item
        ))
    }

    const handleSubmit = async () => {
        if (!toLocationId) {
            toast.error('Selecciona una sucursal destino')
            return
        }
        if (items.length === 0) {
            toast.error('Agrega al menos un producto')
            return
        }

        setIsSubmitting(true)
        try {
            await transferService.createTransfer({
                fromLocationId: fromLocationId!,
                toLocationId,
                transferType: 'manual',
                priority,
                requestNotes: requestNotes || undefined,
                items: items.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantityRequested: item.quantityRequested
                }))
            })
            onSuccess()
        } catch (error: any) {
            toast.error(error.message || 'Error al crear la transferencia')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nueva Transferencia de Inventario</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Destination selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Sucursal Destino *</Label>
                            <Select
                                value={toLocationId?.toString() || ''}
                                onValueChange={(val) => setToLocationId(parseInt(val))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar destino" />
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

                        <div className="space-y-2">
                            <Label>Prioridad</Label>
                            <Select
                                value={priority}
                                onValueChange={(val) => setPriority(val as 'normal' | 'urgent')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="urgent">
                                        <span className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-red-500" />
                                            Urgente
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Product search */}
                    <div className="space-y-2">
                        <Label>Agregar Productos</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar producto por nombre o SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-10"
                                />
                            </div>
                            <BrandButton onClick={handleSearch} disabled={isSearching}>
                                Buscar
                            </BrandButton>
                        </div>

                        {/* Search results */}
                        {searchResults.length > 0 && (
                            <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                                {searchResults.map((product) => (
                                    <div
                                        key={product.id}
                                        className="p-3 hover:bg-muted cursor-pointer flex items-center justify-between"
                                        onClick={() => handleAddProduct(product)}
                                    >
                                        <div>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                                        </div>
                                        <Plus className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Items table */}
                    {items.length > 0 && (
                        <div className="space-y-2">
                            <Label>Productos a Transferir</Label>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead className="text-right">Cantidad</TableHead>
                                        <TableHead className="w-[80px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.productId}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{item.productName}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        SKU: {item.productSku}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantityRequested}
                                                    onChange={(e) => handleQuantityChange(
                                                        item.productId,
                                                        parseInt(e.target.value) || 1
                                                    )}
                                                    className="w-20 text-right"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <BrandButton
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveItem(item.productId)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </BrandButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notas (opcional)</Label>
                        <Textarea
                            placeholder="Notas adicionales sobre la transferencia..."
                            value={requestNotes}
                            onChange={(e) => setRequestNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <BrandButton
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </BrandButton>
                    <BrandButton
                        onClick={handleSubmit}
                        disabled={isSubmitting || items.length === 0 || !toLocationId}
                    >
                        {isSubmitting ? 'Creando...' : 'Crear Transferencia'}
                    </BrandButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
