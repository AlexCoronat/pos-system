'use client'

import { useState } from 'react'
import { CreditCard, Banknote, Building2, Smartphone, User2, Check, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/lib/stores/cart-store'
import { salesService } from '@/lib/services/sales.service'
import type { CreatePaymentData } from '@/lib/types/sales'
import { toast } from 'sonner'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  locationId: number
}

type PaymentMethodType = {
  id: number
  name: string
  icon: typeof CreditCard
  color: string
}

const PAYMENT_METHODS: PaymentMethodType[] = [
  { id: 1, name: 'Efectivo', icon: Banknote, color: 'text-green-600' },
  { id: 2, name: 'Tarjeta', icon: CreditCard, color: 'text-blue-600' },
  { id: 3, name: 'Transferencia', icon: Building2, color: 'text-purple-600' },
  { id: 4, name: 'Mercado Pago', icon: Smartphone, color: 'text-cyan-600' },
  { id: 5, name: 'Crédito', icon: User2, color: 'text-orange-600' }
]

export function PaymentDialog({ open, onOpenChange, onSuccess, locationId }: PaymentDialogProps) {
  const { items, total, customerId, clearCart } = useCartStore()

  const [selectedMethods, setSelectedMethods] = useState<number[]>([])
  const [paymentAmounts, setPaymentAmounts] = useState<Record<number, string>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const totalPaid = Object.values(paymentAmounts).reduce((sum, amount) => {
    return sum + (parseFloat(amount) || 0)
  }, 0)

  const remaining = total - totalPaid

  const handleSelectMethod = (methodId: number) => {
    if (selectedMethods.includes(methodId)) {
      // Remove method
      setSelectedMethods(prev => prev.filter(id => id !== methodId))
      const newAmounts = { ...paymentAmounts }
      delete newAmounts[methodId]
      setPaymentAmounts(newAmounts)
    } else {
      // Add method
      setSelectedMethods(prev => [...prev, methodId])
      // Auto-fill remaining amount if it's the first method
      if (selectedMethods.length === 0) {
        setPaymentAmounts({ ...paymentAmounts, [methodId]: total.toFixed(2) })
      } else {
        setPaymentAmounts({ ...paymentAmounts, [methodId]: remaining.toFixed(2) })
      }
    }
  }

  const handleAmountChange = (methodId: number, value: string) => {
    setPaymentAmounts({ ...paymentAmounts, [methodId]: value })
  }

  const handleProcessPayment = async () => {
    // Validation
    if (selectedMethods.length === 0) {
      toast.error('Selecciona al menos un método de pago')
      return
    }

    if (Math.abs(remaining) > 0.01) {
      toast.error('El monto pagado no coincide con el total')
      return
    }

    setIsProcessing(true)

    try {
      // Prepare sale data
      const payments: CreatePaymentData[] = selectedMethods.map(methodId => ({
        paymentMethodId: methodId,
        amount: parseFloat(paymentAmounts[methodId]) || 0
      }))

      const saleData = {
        locationId,
        customerId,
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          taxAmount: item.taxAmount,
          taxRate: item.taxPercentage // Agregar la tasa de impuesto
        })),
        payments
      }

      // Create sale
      const sale = await salesService.createSale(saleData)

      toast.success(`Venta ${sale.saleNumber} creada exitosamente!`)

      // Clear cart
      clearCart()

      // Reset dialog state
      setSelectedMethods([])
      setPaymentAmounts({})

      // Call success callback
      onSuccess()
    } catch (error: any) {
      console.error('Error processing payment:', error)
      toast.error(error.message || 'Error al procesar el pago')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Procesar Pago</DialogTitle>
          <DialogDescription>
            Selecciona uno o más métodos de pago
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Total Summary */}
          <div className="bg-accent p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>{items.length} producto(s)</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total a Pagar:</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <Label>Métodos de Pago</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon
                const isSelected = selectedMethods.includes(method.id)

                return (
                  <Button
                    key={method.id}
                    variant={isSelected ? 'default' : 'outline'}
                    className="h-20 flex flex-col gap-2"
                    onClick={() => handleSelectMethod(method.id)}
                  >
                    <Icon className={`h-6 w-6 ${isSelected ? '' : method.color}`} />
                    <span className="text-sm">{method.name}</span>
                    {isSelected && <Check className="h-4 w-4 absolute top-2 right-2" />}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Payment Amounts */}
          {selectedMethods.length > 0 && (
            <div className="space-y-3">
              <Label>Montos</Label>
              {selectedMethods.map(methodId => {
                const method = PAYMENT_METHODS.find(m => m.id === methodId)
                if (!method) return null

                return (
                  <div key={methodId} className="flex items-center gap-3">
                    <Label className="min-w-[120px]">{method.name}:</Label>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        value={paymentAmounts[methodId] || ''}
                        onChange={(e) => handleAmountChange(methodId, e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="pl-7"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary */}
          {selectedMethods.length > 0 && (
            <div className="bg-accent/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pagado:</span>
                <span className={totalPaid > total ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(totalPaid)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-semibold">
                  {remaining > 0 ? 'Faltante:' : remaining < 0 ? 'Cambio:' : 'Completado:'}
                </span>
                <Badge
                  variant={remaining === 0 ? 'default' : 'secondary'}
                  className="text-lg px-3 py-1"
                >
                  {formatCurrency(Math.abs(remaining))}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleProcessPayment}
            disabled={isProcessing || Math.abs(remaining) > 0.01 || selectedMethods.length === 0}
            className="min-w-[150px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Completar Venta
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
