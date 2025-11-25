'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('customers')
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
        newErrors.firstName = t('validation.nameRequired')
      }
    } else {
      if (!formData.businessName.trim()) {
        newErrors.businessName = t('validation.businessNameRequired')
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.emailInvalid')
    }

    if (formData.creditLimit && parseFloat(formData.creditLimit) < 0) {
      newErrors.creditLimit = t('validation.creditLimitInvalid')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error(t('validation.formErrors'))
      return
    }

    setIsLoading(true)

    try {
      // Check if email already exists
      if (formData.email) {
        const emailExists = await customerService.checkEmailExists(formData.email)
        if (emailExists) {
          setErrors({ ...errors, email: t('validation.emailExists') })
          toast.error(t('validation.emailInUse'))
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
      toast.success(t('messages.createSuccess'))
      router.push('/dashboard/customers')
    } catch (error: any) {
      console.error('Error creating customer:', error)
      toast.error(error.message || t('messages.createError'))
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
          <h1 className="text-3xl font-bold">{t('form.title')}</h1>
          <p className="text-muted-foreground">
            {t('form.subtitle')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('form.basicInfo.title')}</CardTitle>
              <CardDescription>
                {t('form.basicInfo.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('form.customerType')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{t('filters.individual')}</SelectItem>
                    <SelectItem value="business">{t('filters.business')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'individual' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('form.firstNameRequired')}</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      placeholder={t('form.firstNamePlaceholder')}
                      className={errors.firstName ? 'border-red-500' : ''}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-500">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('form.lastName')}</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      placeholder={t('form.lastNamePlaceholder')}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="businessName">{t('form.businessNameRequired')}</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    placeholder={t('form.businessNamePlaceholder')}
                    className={errors.businessName ? 'border-red-500' : ''}
                  />
                  {errors.businessName && (
                    <p className="text-sm text-red-500">{errors.businessName}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="taxId">{t('form.taxId')}</Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => handleChange('taxId', e.target.value.toUpperCase())}
                  placeholder={t('form.taxIdPlaceholder')}
                  maxLength={13}
                />
              </div>

              {formData.type === 'individual' && (
                <div className="space-y-2">
                  <Label htmlFor="birthDate">{t('form.birthDate')}</Label>
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
                  <Label>{t('form.isActive')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('form.isActiveHelp')}
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
              <CardTitle>{t('form.contactInfo.title')}</CardTitle>
              <CardDescription>
                {t('form.contactInfo.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('form.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder={t('form.emailPlaceholder')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('form.phone')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder={t('form.phonePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">{t('form.mobile')}</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => handleChange('mobile', e.target.value)}
                    placeholder={t('form.mobilePlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t('form.address')}</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder={t('form.addressPlaceholder')}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{t('form.city')}</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder={t('form.cityPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">{t('form.state')}</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder={t('form.statePlaceholder')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">{t('form.postalCode')}</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => handleChange('postalCode', e.target.value)}
                    placeholder={t('form.postalCodePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{t('form.country')}</Label>
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
              <CardTitle>{t('form.creditInfo.title')}</CardTitle>
              <CardDescription>
                {t('form.creditInfo.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="creditLimit">{t('form.creditLimit')}</Label>
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
                    {t('form.creditLimitHelp')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t('form.notes')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder={t('form.notesPlaceholder')}
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
              {t('actions.cancel')}
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('actions.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('actions.save')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
