'use client'

import { useState } from 'react'
import { Trash2, Plus, Minus, ShoppingCart as ShoppingCartIcon, Percent, DollarSign, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCartStore } from '@/lib/stores/cart-store'
import { toast } from 'sonner'

interface ShoppingCartProps {
  onCheckout?: () => void
}

export function ShoppingCart({ onCheckout }: ShoppingCartProps) {
  const {
    items,
    subtotal,
    totalDiscount,
    totalTax,
    total,
    customerName,
    updateItemQuantity,
    removeItem,
    updateItemDiscount,
    removeCustomer,
    clearCart
  } = useCartStore()

  const [discountDialogOpen, setDiscountDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<typeof items[0] | null>(null)
  const [discountValue, setDiscountValue] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage')

  const handleQuantityChange = (productId: number, newQuantity: number, variantId?: number) => {
    try {
      updateItemQuantity(productId, newQuantity, variantId)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleRemoveItem = (productId: number, variantId?: number) => {
    removeItem(productId, variantId)
    toast.success('Producto eliminado del carrito')
  }

  const handleOpenDiscountDialog = (item: typeof items[0]) => {
    setSelectedItem(item)
    setDiscountValue(item.discountPercentage.toString())
    setDiscountType('percentage')
    setDiscountDialogOpen(true)
  }

  const handleApplyDiscount = () => {
    if (!selectedItem) return

    const value = parseFloat(discountValue) || 0

    try {
      updateItemDiscount(
        selectedItem.productId,
        value,
        selectedItem.variantId,
        discountType === 'percentage'
      )
      toast.success('Descuento aplicado')
      setDiscountDialogOpen(false)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  if (items.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5" />
            Carrito de Compra
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <ShoppingCartIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">El carrito está vacío</h3>
          <p className="text-sm text-muted-foreground">
            Busca y agrega productos para comenzar una venta
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCartIcon className="h-5 w-5" />
              Carrito de Compra
              <Badge variant="secondary">{items.length}</Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('¿Limpiar todo el carrito?')) {
                  clearCart()
                  toast.success('Carrito limpiado')
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Customer Info */}
          {customerName && (
            <div className="flex items-center justify-between mt-4 p-2 bg-accent rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{customerName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  removeCustomer()
                  toast.success('Cliente removido')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {items.map((item) => (
            <Card key={`${item.productId}-${item.variantId || 0}`} className="p-4">
              <div className="space-y-3">
                {/* Product Info */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.productName}</h4>
                    <p className="text-sm text-muted-foreground">{item.productSku}</p>
                    {item.variantName && (
                      <Badge variant="outline" className="mt-1">
                        {item.variantName}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.productId, item.variantId)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(item.productId, item.quantity - 1, item.variantId)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>

                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1
                      handleQuantityChange(item.productId, value, item.variantId)
                    }}
                    className="w-20 text-center"
                    min="1"
                    max={item.availableStock}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(item.productId, item.quantity + 1, item.variantId)}
                    disabled={item.quantity >= item.availableStock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <span className="text-sm text-muted-foreground ml-2">
                    de {item.availableStock}
                  </span>
                </div>

                {/* Price and Discount */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Precio unitario:</span>
                    <span className="font-medium">{formatCurrency(item.unitPrice)}</span>
                  </div>

                  {item.discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-600">
                      <span>Descuento ({item.discountPercentage.toFixed(0)}%):</span>
                      <span>-{formatCurrency(item.discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span>Impuestos:</span>
                    <span>{formatCurrency(item.taxAmount)}</span>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between font-semibold">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(item.total)}</span>
                  </div>
                </div>

                {/* Discount Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleOpenDiscountDialog(item)}
                >
                  <Percent className="h-4 w-4 mr-2" />
                  {item.discountAmount > 0 ? 'Modificar descuento' : 'Aplicar descuento'}
                </Button>
              </div>
            </Card>
          ))}
        </CardContent>

        <CardFooter className="flex-col gap-3 border-t pt-4">
          {/* Totals */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex items-center justify-between text-sm text-green-600">
                <span>Descuentos:</span>
                <span>-{formatCurrency(totalDiscount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span>Impuestos (16%):</span>
              <span>{formatCurrency(totalTax)}</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between text-xl font-bold">
              <span>TOTAL:</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <Button
            className="w-full h-12 text-lg"
            size="lg"
            onClick={onCheckout}
          >
            <DollarSign className="h-5 w-5 mr-2" />
            Procesar Pago
          </Button>
        </CardFooter>
      </Card>

      {/* Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar Descuento</DialogTitle>
            <DialogDescription>
              {selectedItem?.productName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={discountType === 'percentage' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setDiscountType('percentage')}
              >
                <Percent className="h-4 w-4 mr-2" />
                Porcentaje
              </Button>
              <Button
                variant={discountType === 'amount' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setDiscountType('amount')}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Cantidad
              </Button>
            </div>

            <div className="space-y-2">
              <Label>
                {discountType === 'percentage' ? 'Porcentaje de descuento' : 'Cantidad a descontar'}
              </Label>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '0-100' : '0.00'}
                min="0"
                max={discountType === 'percentage' ? '100' : selectedItem?.total.toString()}
                step={discountType === 'percentage' ? '1' : '0.01'}
              />
            </div>

            {selectedItem && (
              <div className="bg-accent p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal original:</span>
                  <span>{formatCurrency(selectedItem.unitPrice * selectedItem.quantity)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Descuento:</span>
                  <span>
                    -{formatCurrency(
                      discountType === 'percentage'
                        ? ((selectedItem.unitPrice * selectedItem.quantity) * (parseFloat(discountValue) || 0)) / 100
                        : parseFloat(discountValue) || 0
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Nuevo total:</span>
                  <span>
                    {formatCurrency(
                      (selectedItem.unitPrice * selectedItem.quantity) -
                      (discountType === 'percentage'
                        ? ((selectedItem.unitPrice * selectedItem.quantity) * (parseFloat(discountValue) || 0)) / 100
                        : parseFloat(discountValue) || 0)
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyDiscount}>
              Aplicar Descuento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
