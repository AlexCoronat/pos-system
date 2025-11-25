'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Users,
  Building2,
  Mail,
  Phone
} from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { customerService, } from '@/lib/services/customer.service'
import type { CustomerListItem, CustomerFilters } from '@/lib/types/customer'
import { toast } from 'sonner'

export default function CustomersPage() {
  const router = useRouter()
  const t = useTranslations('customers')
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const pageSize = 20

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<CustomerListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const getCustomerName = (customer: CustomerListItem) => {
    if (customer.type === 'business' && customer.businessName) {
      return customer.businessName
    }
    return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Sin nombre'
  }

  const loadCustomers = async () => {
    setIsLoading(true)
    try {
      const filters: CustomerFilters = {}

      if (searchTerm) {
        filters.searchTerm = searchTerm
      }

      if (typeFilter !== 'all') {
        filters.type = typeFilter as 'individual' | 'business'
      }

      if (statusFilter !== 'all') {
        filters.isActive = statusFilter === 'active'
      }

      const response = await customerService.getCustomers(filters, currentPage, pageSize)
      setCustomers(response.customers)
      setTotalPages(response.totalPages)
      setTotalCustomers(response.total)
    } catch (error: any) {
      console.error('Error loading customers:', error)
      toast.error(t('messages.loadError'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [currentPage, typeFilter, statusFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadCustomers()
  }

  const handleDeleteClick = (customer: CustomerListItem) => {
    setCustomerToDelete(customer)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return

    setIsDeleting(true)
    try {
      await customerService.deleteCustomer(customerToDelete.id)
      toast.success(t('messages.deleteSuccess'))
      loadCustomers()
    } catch (error: any) {
      toast.error(error.message || t('messages.deleteError'))
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
    }
  }

  // Stats
  const activeCustomers = customers.filter(c => c.isActive).length
  const businessCustomers = customers.filter(c => c.type === 'business').length
  const withCredit = customers.filter(c => (c.creditLimit || 0) > 0).length

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
        <Link href="/dashboard/customers/new">
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            {t('newCustomer')}
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.totalCustomers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.activeCustomers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeCustomers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.businesses')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {businessCustomers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.withCredit')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {withCredit}
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

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('filters.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
                <SelectItem value="individual">{t('filters.individual')}</SelectItem>
                <SelectItem value="business">{t('filters.business')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.all')}</SelectItem>
                <SelectItem value="active">{t('filters.active')}</SelectItem>
                <SelectItem value="inactive">{t('filters.inactive')}</SelectItem>
              </SelectContent>
            </Select>

            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              {t('filters.search')}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={loadCustomers}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('filters.refresh')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              {t('loading')}
            </div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t('noCustomers')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.customer')}</TableHead>
                    <TableHead>{t('table.type')}</TableHead>
                    <TableHead>{t('table.contact')}</TableHead>
                    <TableHead>{t('table.city')}</TableHead>
                    <TableHead className="text-right">{t('table.creditLimit')}</TableHead>
                    <TableHead className="text-right">{t('table.balance')}</TableHead>
                    <TableHead className="text-right">{t('table.points')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead className="text-right">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${customer.type === 'business' ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                            {customer.type === 'business' ? (
                              <Building2 className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Users className="h-5 w-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{getCustomerName(customer)}</div>
                            {customer.customerNumber && (
                              <div className="text-sm text-muted-foreground">
                                {customer.customerNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {customer.type === 'business' ? t('types.business') : t('types.individual')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {customer.email}
                            </div>
                          )}
                          {(customer.phone || customer.mobile) && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {customer.phone || customer.mobile}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{customer.city || '-'}</TableCell>
                      <TableCell className="text-right">
                        {customer.creditLimit ? formatCurrency(customer.creditLimit) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {customer.currentBalance !== undefined && customer.currentBalance !== 0 ? (
                          <span className={customer.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                            {formatCurrency(customer.currentBalance)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {customer.loyaltyPoints || 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={customer.isActive ? 'default' : 'secondary'}
                          className={customer.isActive ? 'bg-green-100 text-green-800' : ''}
                        >
                          {customer.isActive ? t('status.active') : t('status.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t('actions.viewDetails')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/customers/${customer.id}?edit=true`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {t('actions.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteClick(customer)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('actions.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                {t('pagination.page')} {currentPage} {t('pagination.of')} {totalPages} ({totalCustomers} {t('pagination.customersTotal')})
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: customerToDelete ? getCustomerName(customerToDelete) : '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
