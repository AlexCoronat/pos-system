'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Ban, RotateCcw, Eye, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { salesService } from '@/lib/services/sales.service'
import type { SaleWithItems } from '@/lib/types/sales'
import { toast } from 'sonner'
import Link from 'next/link'

const STATUS_COLORS = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800'
}

const STATUS_LABELS = {
  completed: 'Completada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada'
}

const PAYMENT_METHOD_NAMES: Record<number, string> = {
  1: 'Efectivo',
  2: 'Tarjeta',
  3: 'Transferencia',
  4: 'Mercado Pago',
  5: 'Crédito'
}

export default function SaleDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [sale, setSale] = useState<SaleWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const loadSale = async () => {
    setIsLoading(true)
    try {
      const saleData = await salesService.getSaleById(parseInt(params.id))
      setSale(saleData)
    } catch (error: any) {
      console.error('Error loading sale:', error)
      toast.error('Error al cargar la venta')
      router.push('/dashboard/sales')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSale()
  }, [params.id])

  const handleCancelSale = async () => {
    if (!sale || !cancelReason.trim()) {
      toast.error('Debes proporcionar un motivo de cancelación')
      return
    }

    setIsCancelling(true)
    try {
      await salesService.cancelSale(sale.id, cancelReason)
      toast.success('Venta cancelada exitosamente')
      setCancelDialogOpen(false)
      loadSale()
    } catch (error: any) {
      console.error('Error cancelling sale:', error)
      toast.error(error.message || 'Error al cancelar la venta')
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando venta...</p>
        </div>
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Venta no encontrada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/sales">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{sale.saleNumber}</h1>
              <Badge className={STATUS_COLORS[sale.status]}>
                {STATUS_LABELS[sale.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {formatDate(sale.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
          {sale.status === 'completed' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => setCancelDialogOpen(true)}
              >
                <Ban className="h-4 w-4 mr-2" />
                Cancelar Venta
              </Button>
              <Button variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reembolsar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{sale.customerName || 'Cliente general'}</p>
            {sale.customerId && (
              <Button variant="link" className="p-0 h-auto mt-2" size="sm">
                <Eye className="h-3 w-3 mr-1" />
                Ver perfil
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Location Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ubicación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{sale.locationName || `Ubicación ${sale.locationId}`}</p>
          </CardContent>
        </Card>

        {/* Sold By */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Vendido por</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{sale.soldByName || 'Usuario'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos ({sale.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-center">Cantidad</TableHead>
                <TableHead className="text-right">Precio Unit.</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead className="text-right">Impuestos</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      {item.variantName && (
                        <Badge variant="outline" className="mt-1">
                          {item.variantName}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.productSku}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.taxAmount)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(item.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals and Payments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
            </div>

            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuentos:</span>
                <span className="font-medium">-{formatCurrency(sale.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Impuestos (16%):</span>
              <span className="font-medium">{formatCurrency(sale.taxAmount)}</span>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>TOTAL:</span>
              <span className="text-primary">{formatCurrency(sale.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sale.payments.map((payment) => (
              <div key={payment.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {PAYMENT_METHOD_NAMES[payment.paymentMethodId] || 'Método de pago'}
                  </p>
                  {payment.reference && (
                    <p className="text-sm text-muted-foreground">
                      Ref: {payment.reference}
                    </p>
                  )}
                </div>
                <span className="font-semibold">{formatCurrency(payment.amount)}</span>
              </div>
            ))}

            <Separator />

            <div className="flex justify-between font-bold">
              <span>Total Pagado:</span>
              <span className="text-green-600">
                {formatCurrency(sale.payments.reduce((sum, p) => sum + p.amount, 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {sale.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{sale.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Venta</DialogTitle>
            <DialogDescription>
              Esta acción cancelará la venta y restaurará el inventario.
              Por favor proporciona un motivo de cancelación.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo de cancelación *</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Describe el motivo de la cancelación..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              Cerrar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSale}
              disabled={isCancelling || !cancelReason.trim()}
            >
              {isCancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
