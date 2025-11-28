'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  ArrowLeft,
  Save,
  Loader2,
  Edit,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  ShoppingCart,
  TrendingUp,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { customerService } from '@/lib/services/customer.service'
import { toast } from 'sonner'
import type { Customer, UpdateCustomerData, CustomerPurchaseHistory, CustomerStats } from '@/lib/types/customer'

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const customerId = parseInt(params.id)

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [purchaseHistory, setPurchaseHistory] = useState<CustomerPurchaseHistory[]>([])
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true')

  // Form state
  const [formData, setFormData] = useState({
    type: 'individual',
    firstName: '',
    lastName: '',
    businessName: '',
    taxId: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Mexico',
    birthDate: '',
    creditLimit: '0',
    notes: '',
    isActive: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getCustomerName = (customer: Customer) => {
    if (customer.type === 'business' && customer.businessName) {
      return customer.businessName
    }
    return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Sin nombre'
  }

  const loadCustomer = async () => {
    try {
      const data = await customerService.getCustomerById(customerId)
      setCustomer(data)

      // Populate form with customer data
      setFormData({
        type: data.type || 'individual',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        businessName: data.businessName || '',
        taxId: data.taxId || '',
        email: data.email || '',
        phone: data.phone || '',
        mobile: data.mobile || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postalCode: data.postalCode || '',
        country: data.country || 'Mexico',
        birthDate: data.birthDate ? new Date(data.birthDate).toISOString().split('T')[0] : '',
        creditLimit: (data.creditLimit || 0).toString(),
        notes: data.notes || '',
        isActive: data.isActive
      })
    } catch (error: any) {
      console.error('Error loading customer:', error)
      toast.error('Error al cargar el cliente')
      router.push('/dashboard/customers')
    }
  }

  const loadPurchaseHistory = async () => {
    try {
      const history = await customerService.getCustomerPurchaseHistory(customerId)
      setPurchaseHistory(history)
    } catch (error: any) {
      console.error('Error loading purchase history:', error)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await customerService.getCustomerStats(customerId)
      setStats(statsData)
    } catch (error: any) {
      console.error('Error loading stats:', error)
    }
  }

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true)
      await Promise.all([
        loadCustomer(),
        loadPurchaseHistory(),
        loadStats()
      ])
      setIsLoading(false)
    }

    loadAllData()
  }, [customerId])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (formData.type === 'individual') {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'El nombre es requerido'
      }
    } else {
      if (!formData.businessName.trim()) {
        newErrors.businessName = 'El nombre de la empresa es requerido'
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalido'
    }

    if (formData.creditLimit && parseFloat(formData.creditLimit) < 0) {
      newErrors.creditLimit = 'El limite de credito debe ser mayor o igual a 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario')
      return
    }

    setIsSaving(true)

    try {
      // Check if email already exists (excluding current customer)
      if (formData.email && formData.email !== customer?.email) {
        const emailExists = await customerService.checkEmailExists(formData.email, customerId)
        if (emailExists) {
          setErrors({ ...errors, email: 'Este email ya esta registrado' })
          toast.error('El email ya esta en uso')
          setIsSaving(false)
          return
        }
      }

      const updateData: UpdateCustomerData = {
        type: formData.type as 'individual' | 'business',
        firstName: formData.firstName.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
        businessName: formData.businessName.trim() || undefined,
        taxId: formData.taxId.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        mobile: formData.mobile.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        country: formData.country.trim() || undefined,
        birthDate: formData.birthDate || undefined,
        creditLimit: parseFloat(formData.creditLimit) || 0,
        isActive: formData.isActive,
        notes: formData.notes.trim() || undefined
      }

      const updatedCustomer = await customerService.updateCustomer(customerId, updateData)
      setCustomer(updatedCustomer)
      toast.success('Cliente actualizado exitosamente')
      setIsEditing(false)
    } catch (error: any) {
      console.error('Error updating customer:', error)
      toast.error(error.message || 'Error al actualizar el cliente')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleCancelEdit = () => {
    if (customer) {
      setFormData({
        type: customer.type || 'individual',
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        businessName: customer.businessName || '',
        taxId: customer.taxId || '',
        email: customer.email || '',
        phone: customer.phone || '',
        mobile: customer.mobile || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        postalCode: customer.postalCode || '',
        country: customer.country || 'Mexico',
        birthDate: customer.birthDate ? new Date(customer.birthDate).toISOString().split('T')[0] : '',
        creditLimit: (customer.creditLimit || 0).toString(),
        notes: customer.notes || '',
        isActive: customer.isActive
      })
    }
    setErrors({})
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-6">
        <p className="text-center text-muted-foreground">Cliente no encontrado</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{getCustomerName(customer)}</h1>
            <div className="flex items-center gap-2 mt-1">
              {customer.customerNumber && (
                <span className="text-sm text-muted-foreground">
                  {customer.customerNumber}
                </span>
              )}
              <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                {customer.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
              <Badge variant="outline">
                {customer.type === 'business' ? 'Empresa' : 'Individual'}
              </Badge>
            </div>
          </div>
        </div>

        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Informacion</TabsTrigger>
          <TabsTrigger value="history">Historial de Compras</TabsTrigger>
          <TabsTrigger value="stats">Estadisticas</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informacion Basica</CardTitle>
                    <CardDescription>
                      Datos principales del cliente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tipo de Cliente</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => handleChange('type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="business">Empresa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.type === 'individual' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">Nombre *</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => handleChange('firstName', e.target.value)}
                            placeholder="Nombre"
                            className={errors.firstName ? 'border-red-500' : ''}
                          />
                          {errors.firstName && (
                            <p className="text-sm text-red-500">{errors.firstName}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Apellido</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => handleChange('lastName', e.target.value)}
                            placeholder="Apellido"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Nombre de la Empresa *</Label>
                        <Input
                          id="businessName"
                          value={formData.businessName}
                          onChange={(e) => handleChange('businessName', e.target.value)}
                          placeholder="Razon social"
                          className={errors.businessName ? 'border-red-500' : ''}
                        />
                        {errors.businessName && (
                          <p className="text-sm text-red-500">{errors.businessName}</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="taxId">RFC</Label>
                      <Input
                        id="taxId"
                        value={formData.taxId}
                        onChange={(e) => handleChange('taxId', e.target.value.toUpperCase())}
                        placeholder="RFC del cliente"
                        maxLength={13}
                      />
                    </div>

                    {formData.type === 'individual' && (
                      <div className="space-y-2">
                        <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                        <Input
                          id="birthDate"
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => handleChange('birthDate', e.target.value)}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Estado</Label>
                        <p className="text-sm text-muted-foreground">
                          Cliente activo en el sistema
                        </p>
                      </div>
                      <Switch
                        checked={formData.isActive}
                        onCheckedChange={(checked) => handleChange('isActive', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informacion de Contacto</CardTitle>
                    <CardDescription>
                      Datos para comunicacion con el cliente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">{errors.email}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefono</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile">Celular</Label>
                        <Input
                          id="mobile"
                          value={formData.mobile}
                          onChange={(e) => handleChange('mobile', e.target.value)}
                          placeholder="(555) 987-6543"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Direccion</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="Calle, numero, colonia..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Ciudad</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => handleChange('city', e.target.value)}
                          placeholder="Ciudad"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) => handleChange('state', e.target.value)}
                          placeholder="Estado"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Codigo Postal</Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode}
                          onChange={(e) => handleChange('postalCode', e.target.value)}
                          placeholder="12345"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Pais</Label>
                        <Input
                          id="country"
                          value={formData.country}
                          onChange={(e) => handleChange('country', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Credit and Notes */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Credito y Notas</CardTitle>
                    <CardDescription>
                      Configuracion de credito e informacion adicional
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="creditLimit">Limite de Credito</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input
                            id="creditLimit"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.creditLimit}
                            onChange={(e) => handleChange('creditLimit', e.target.value)}
                            className={`pl-7 ${errors.creditLimit ? 'border-red-500' : ''}`}
                          />
                        </div>
                        {errors.creditLimit && (
                          <p className="text-sm text-red-500">{errors.creditLimit}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notas</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => handleChange('notes', e.target.value)}
                          placeholder="Notas adicionales sobre el cliente..."
                          rows={4}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Informacion Basica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customer.type === 'business' ? (
                    <div>
                      <p className="text-sm text-muted-foreground">Razon Social</p>
                      <p className="font-medium">{customer.businessName || '-'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Nombre</p>
                        <p className="font-medium">{customer.firstName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Apellido</p>
                        <p className="font-medium">{customer.lastName || '-'}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">RFC</p>
                    <p className="font-medium">{customer.taxId || '-'}</p>
                  </div>

                  {customer.type === 'individual' && customer.birthDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha de Nacimiento</p>
                        <p className="font-medium">{formatDate(customer.birthDate)}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">Registrado</p>
                    <p className="font-medium">{formatDate(customer.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{customer.email}</p>
                      </div>
                    </div>
                  )}

                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Telefono</p>
                        <p className="font-medium">{customer.phone}</p>
                      </div>
                    </div>
                  )}

                  {customer.mobile && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Celular</p>
                        <p className="font-medium">{customer.mobile}</p>
                      </div>
                    </div>
                  )}

                  {(customer.address || customer.city) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Direccion</p>
                        <p className="font-medium">
                          {customer.address && <span>{customer.address}<br /></span>}
                          {customer.city && <span>{customer.city}, </span>}
                          {customer.state && <span>{customer.state} </span>}
                          {customer.postalCode && <span>{customer.postalCode}</span>}
                          {customer.country && <><br />{customer.country}</>}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Credit Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Credito
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Limite de Credito</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(customer.creditLimit || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo Actual</p>
                      <p className={`text-xl font-bold ${(customer.currentBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                        {formatCurrency(customer.currentBalance || 0)}
                      </p>
                    </div>
                  </div>

                  {(customer.creditLimit || 0) > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Credito Disponible</p>
                      <p className="font-medium">
                        {formatCurrency((customer.creditLimit || 0) - (customer.currentBalance || 0))}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {customer.notes || 'Sin notas adicionales'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Purchase History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Historial de Compras
              </CardTitle>
              <CardDescription>
                Ultimas compras realizadas por el cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {purchaseHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Este cliente no tiene compras registradas
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Venta</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-center">Articulos</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseHistory.map((purchase) => (
                      <TableRow
                        key={purchase.saleId}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          {purchase.saleNumber}
                        </TableCell>
                        <TableCell>{formatDate(purchase.date)}</TableCell>
                        <TableCell className="text-center">
                          {purchase.itemCount}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(purchase.total)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              purchase.status === 'completed' ? 'default' :
                                purchase.status === 'cancelled' ? 'destructive' :
                                  'secondary'
                            }
                          >
                            {purchase.status === 'completed' ? 'Completada' :
                              purchase.status === 'cancelled' ? 'Cancelada' :
                                purchase.status === 'pending' ? 'Pendiente' :
                                  purchase.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Total Compras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalPurchases || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Gastado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats?.totalSpent || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Ticket Promedio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.averageTicket || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Puntos de Lealtad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {stats?.loyaltyPoints || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {stats?.lastPurchaseDate && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Ultima compra: {formatDate(stats.lastPurchaseDate)}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
