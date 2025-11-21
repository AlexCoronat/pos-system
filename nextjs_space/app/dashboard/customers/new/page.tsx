'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
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
import { customerService } from '@/lib/services/customer.service'
import { toast } from 'sonner'
import type { CreateCustomerData } from '@/lib/types/customer'

export default function NewCustomerPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

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

    setIsLoading(true)

    try {
      // Check if email already exists
      if (formData.email) {
        const emailExists = await customerService.checkEmailExists(formData.email)
        if (emailExists) {
          setErrors({ ...errors, email: 'Este email ya esta registrado' })
          toast.error('El email ya esta en uso')
          setIsLoading(false)
          return
        }
      }

      const customerData: CreateCustomerData = {
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

      await customerService.createCustomer(customerData)
      toast.success('Cliente creado exitosamente')
      router.push('/dashboard/customers')
    } catch (error: any) {
      console.error('Error creating customer:', error)
      toast.error(error.message || 'Error al crear el cliente')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Cliente</h1>
          <p className="text-muted-foreground">
            Registra un nuevo cliente en el sistema
          </p>
        </div>
      </div>

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
                  <p className="text-sm text-muted-foreground">
                    Monto maximo de credito permitido. Dejar en 0 para no otorgar credito.
                  </p>
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
          <Link href="/dashboard/customers">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cliente
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
