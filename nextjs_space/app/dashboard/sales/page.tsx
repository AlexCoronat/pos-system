'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Search, Filter, Eye, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { salesService } from '@/lib/services/sales.service'
import type { SaleListItem, SaleFilters } from '@/lib/types/sales'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

const STATUS_COLORS = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800'
}

export default function SalesPage() {
  const t = useTranslations('sales')
  const router = useRouter()
  const [sales, setSales] = useState<SaleListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const loadSales = async () => {
    setIsLoading(true)
    try {
      const filters: SaleFilters = {}

      if (searchTerm) {
        filters.saleNumber = searchTerm
      }

      if (statusFilter !== 'all') {
        filters.status = statusFilter as any
      }

      const response = await salesService.getSales(filters, currentPage, pageSize)
      setSales(response.sales)
      setTotalPages(response.totalPages)
      setTotal(response.total)
    } catch (error: any) {
      console.error('Error loading sales:', error)
      toast.error(t('errors.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSales()
  }, [currentPage, statusFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadSales()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Link href="/dashboard/sales/new">
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            {t('newSale')}
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.totalSales')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.completed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {sales.filter(s => s.status === 'completed').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.pending')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {sales.filter(s => s.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.cancelled')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {sales.filter(s => s.status === 'cancelled').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filters.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('filters.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                <SelectItem value="completed">{t('status.completed')}</SelectItem>
                <SelectItem value="pending">{t('status.pending')}</SelectItem>
                <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
                <SelectItem value="refunded">{t('status.refunded')}</SelectItem>
              </SelectContent>
            </Select>

            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              {t('filters.search')}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={loadSales}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('filters.refresh')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              {t('loading')}
            </div>
          ) : sales.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t('noSales')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.number')}</TableHead>
                    <TableHead>{t('table.date')}</TableHead>
                    <TableHead>{t('table.customer')}</TableHead>
                    <TableHead>{t('table.products')}</TableHead>
                    <TableHead className="text-right">{t('table.subtotal')}</TableHead>
                    <TableHead className="text-right">{t('table.discount')}</TableHead>
                    <TableHead className="text-right">{t('table.taxes')}</TableHead>
                    <TableHead className="text-right">{t('table.total')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead className="text-right">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id} className="cursor-pointer hover:bg-accent">
                      <TableCell className="font-mono text-sm">
                        {sale.saleNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(sale.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {sale.customerName || t('table.generalCustomer')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {sale.itemCount} {sale.itemCount === 1 ? t('table.product') : t('table.products_plural')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.subtotal)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {sale.discountAmount > 0 ? `-${formatCurrency(sale.discountAmount)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.taxAmount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(sale.total)}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[sale.status]}>
                          {t(`status.${sale.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/sales/${sale.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t('pagination.page')} {currentPage} {t('pagination.of')} {totalPages} ({total} {t('pagination.salesTotal')})
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {t('pagination.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
