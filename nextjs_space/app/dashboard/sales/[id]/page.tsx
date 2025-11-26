'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Ban, RotateCcw, Eye, Package, Loader2 } from 'lucide-react'
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
import { pdf } from '@react-pdf/renderer'
import { SaleReceiptPDF } from '@/components/sales/SaleReceiptPDF'

const STATUS_COLORS = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800'
}

const PAYMENT_METHOD_KEYS: Record<number, string> = {
  1: 'cash',
  2: 'card',
  3: 'transfer',
  4: 'mercadoPago',
  5: 'credit'
}

export default function SaleDetailPage({ params }: { params: { id: string } }) {
  const t = useTranslations('sales.detail')
  const tStatus = useTranslations('sales.status')
  const router = useRouter()
  const [sale, setSale] = useState<SaleWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const handleDownloadPDF = async () => {
    if (!sale) return

    setIsGeneratingPDF(true)
    try {
      const blob = await pdf(
        <SaleReceiptPDF
          sale={sale}
          businessName="Mi Negocio"
          // TODO: Get business info from context
        />
      ).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Recibo-${sale.saleNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(t('messages.pdfDownloaded'))
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error(t('messages.pdfError'))
    } finally {
      setIsGeneratingPDF(false)
    }
  }

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
      toast.error(t('messages.loadError'))
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
      toast.error(t('messages.cancelReasonRequired'))
      return
    }

    setIsCancelling(true)
    try {
      await salesService.cancelSale(sale.id, cancelReason)
      toast.success(t('messages.cancelSuccess'))
      setCancelDialogOpen(false)
      loadSale()
    } catch (error: any) {
      console.error('Error cancelling sale:', error)
      toast.error(error.message || t('messages.cancelError'))
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('notFound')}</p>
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
              {t('back')}
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{sale.saleNumber}</h1>
              <Badge className={STATUS_COLORS[sale.status]}>
                {tStatus(sale.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {formatDate(sale.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isGeneratingPDF ? t('generating') : t('downloadPDF')}
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
                {t('cancelSale')}
              </Button>
              <Button variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('refund')}
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
            <CardTitle className="text-sm font-medium">{t('customer')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{sale.customerName || t('generalCustomer')}</p>
            {sale.customerId && (
              <Button variant="link" className="p-0 h-auto mt-2" size="sm">
                <Eye className="h-3 w-3 mr-1" />
                {t('viewProfile')}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Location Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('location')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{sale.locationName || t('locationFallback', { id: sale.locationId })}</p>
          </CardContent>
        </Card>

        {/* Sold By */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('soldBy')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{sale.soldByName || t('userFallback')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('products')} ({sale.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('itemsTable.product')}</TableHead>
                <TableHead>{t('itemsTable.sku')}</TableHead>
                <TableHead className="text-center">{t('itemsTable.quantity')}</TableHead>
                <TableHead className="text-right">{t('itemsTable.unitPrice')}</TableHead>
                <TableHead className="text-right">{t('itemsTable.discount')}</TableHead>
                <TableHead className="text-right">{t('itemsTable.taxes')}</TableHead>
                <TableHead className="text-right">{t('itemsTable.total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item) => {
                // El unitPrice almacenado incluye el impuesto
                // Necesitamos mostrar el precio sin impuesto
                const TAX_RATE = 16 // TODO: Obtener del item si está disponible
                const priceWithTax = item.unitPrice
                const priceWithoutTax = priceWithTax / (1 + TAX_RATE / 100)

                return (
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
                      {formatCurrency(priceWithoutTax)}
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
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals and Payments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle>{t('summary.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('summary.subtotal')}</span>
              <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
            </div>

            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t('summary.discounts')}</span>
                <span className="font-medium">-{formatCurrency(sale.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('summary.taxes')}</span>
              <span className="font-medium">{formatCurrency(sale.taxAmount)}</span>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>{t('summary.total')}</span>
              <span className="text-primary">{formatCurrency(sale.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader>
            <CardTitle>{t('payments.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sale.payments.map((payment) => {
              const methodKey = PAYMENT_METHOD_KEYS[payment.paymentMethodId]
              return (
                <div key={payment.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {methodKey ? t(`payments.methods.${methodKey}`) : t('payments.methodFallback')}
                    </p>
                    {payment.reference && (
                      <p className="text-sm text-muted-foreground">
                        {t('payments.reference')} {payment.reference}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                </div>
              )
            })}

            <Separator />

            <div className="flex justify-between font-bold">
              <span>{t('payments.totalPaid')}</span>
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
            <CardTitle>{t('notes')}</CardTitle>
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
            <DialogTitle>{t('cancelDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('cancelDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('cancelDialog.reasonLabel')}</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t('cancelDialog.reasonPlaceholder')}
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
              {t('cancelDialog.close')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSale}
              disabled={isCancelling || !cancelReason.trim()}
            >
              {isCancelling ? t('cancelDialog.cancelling') : t('cancelDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
