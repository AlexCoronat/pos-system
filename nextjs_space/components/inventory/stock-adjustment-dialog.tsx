'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { BrandButton } from '@/components/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inventoryService, InventoryWithProduct } from '@/lib/services/inventory.service'
import { toast } from 'sonner'

interface StockAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryItem?: InventoryWithProduct | null
  onSuccess?: () => void
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  inventoryItem,
  onSuccess
}: StockAdjustmentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [movementType, setMovementType] = useState<'entry' | 'exit' | 'adjustment'>('entry')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inventoryItem) return

    const qty = parseInt(quantity)
    if (!qty || qty <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }

    if (movementType === 'exit' && qty > inventoryItem.quantity) {
      toast.error('No hay suficiente stock para realizar la salida')
      return
    }

    setIsLoading(true)

    try {
      await inventoryService.adjustInventory({
        productId: inventoryItem.productId,
        variantId: inventoryItem.variantId,
        locationId: inventoryItem.locationId,
        quantity: qty,
        movementType,
        notes: notes.trim() || undefined
      })

      toast.success(
        movementType === 'entry'
          ? `Se agregaron ${qty} unidades al inventario`
          : movementType === 'exit'
            ? `Se retiraron ${qty} unidades del inventario`
            : `Stock ajustado a ${qty} unidades`
      )

      // Reset form
      setQuantity('')
      setNotes('')
      setMovementType('entry')

      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || 'Error al ajustar el inventario')
    } finally {
      setIsLoading(false)
    }
  }

  const getMovementDescription = () => {
    switch (movementType) {
      case 'entry':
        return 'Agregar unidades al stock actual'
      case 'exit':
        return 'Retirar unidades del stock actual'
      case 'adjustment':
        return 'Establecer la cantidad exacta de stock'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajustar Inventario</DialogTitle>
          <DialogDescription>
            {inventoryItem ? (
              <>
                Producto: <span className="font-medium">{inventoryItem.productName}</span>
                <br />
                Stock actual: <span className="font-medium">{inventoryItem.quantity}</span>
              </>
            ) : (
              'Selecciona un producto para ajustar'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Movimiento</Label>
            <Select
              value={movementType}
              onValueChange={(value: 'entry' | 'exit' | 'adjustment') => setMovementType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entrada</SelectItem>
                <SelectItem value="exit">Salida</SelectItem>
                <SelectItem value="adjustment">Ajuste</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getMovementDescription()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              {movementType === 'adjustment' ? 'Nueva Cantidad' : 'Cantidad'}
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={movementType === 'adjustment' ? 'Nueva cantidad total' : 'Cantidad a mover'}
              required
            />
            {movementType === 'exit' && inventoryItem && (
              <p className="text-sm text-muted-foreground">
                Maximo disponible: {inventoryItem.quantity}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Razon del ajuste..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <BrandButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </BrandButton>
            <button
              type="submit"
              disabled={!inventoryItem || isLoading}
              className="inline-flex items-center justify-center rounded-lg font-medium px-4 py-2 text-white hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-primary, #3B82F6)' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Guardar'
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
