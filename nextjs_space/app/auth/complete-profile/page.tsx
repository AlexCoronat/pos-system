'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  User, Phone, Building2, MapPin,
  ArrowRight, ArrowLeft, Check, Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { authService } from '@/lib/services/auth.service'
import { ROUTES, MESSAGES } from '@/lib/constants'
import { getUserFriendlyMessage } from '@/lib/utils/error-handler'

type Step = 1 | 2 | 3

export default function CompleteProfilePage() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [formData, setFormData] = useState({
    // Personal data
    firstName: '',
    lastName: '',
    phone: '',
    // Business data
    businessName: '',
    businessTaxId: '',
    businessType: '',
    // Location data
    locationName: '',
    locationAddress: '',
    locationCity: '',
    locationState: '',
    locationPostalCode: '',
    locationPhone: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push(ROUTES.AUTH.LOGIN)
        return
      }

      setUserEmail(session.user.email || '')
      setUserId(session.user.id)
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [router])

  const validateStep1 = () => {
    if (!formData.firstName || !formData.lastName) {
      toast({
        title: "Campos requeridos",
        description: "Por favor ingresa tu nombre y apellido",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.businessName) {
      toast({
        title: "Campo requerido",
        description: "El nombre del negocio es obligatorio",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const validateStep3 = () => {
    if (!formData.locationName) {
      toast({
        title: "Campo requerido",
        description: "El nombre de la ubicación es obligatorio",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStep3()) return

    setIsLoading(true)

    try {
      const supabase = createClient()

      // 1. Complete the basic profile
      await authService.completeOAuthProfile(userId, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined
      })

      // 2. Create the business for this user
      // Get Admin role ID
      const { data: adminRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'Admin')
        .is('business_id', null)
        .single()

      // Create business
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert({
          name: formData.businessName,
          tax_id: formData.businessTaxId || null,
          business_type: formData.businessType || null,
          owner_id: userId,
          plan_id: 1,
          is_active: true
        })
        .select()
        .single()

      if (businessError) throw businessError

      // IMPORTANT: First update user_details with business_id so RLS policies work
      const { error: updateBusinessError } = await supabase
        .from('user_details')
        .update({
          business_id: business.id,
          role_id: adminRole?.id || null
        })
        .eq('id', userId)

      if (updateBusinessError) throw updateBusinessError

      // Now create location (RLS will allow it because user has business_id)
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .insert({
          business_id: business.id,
          code: `LOC-${business.id}-001`,
          name: formData.locationName || 'Principal',
          address: formData.locationAddress || null,
          city: formData.locationCity || null,
          state: formData.locationState || null,
          postal_code: formData.locationPostalCode || null,
          phone: formData.locationPhone || null,
          is_active: true
        })
        .select()
        .single()

      if (locationError) throw locationError

      // Update user with default location
      const { error: updateLocationError } = await supabase
        .from('user_details')
        .update({
          default_location_id: location.id
        })
        .eq('id', userId)

      if (updateLocationError) throw updateLocationError

      // Assign user to location
      await supabase
        .from('user_locations')
        .insert({
          user_id: userId,
          location_id: location.id,
          is_primary: true
        })

      // Reload user profile to get updated role and permissions
      await authService.completeOAuthProfile(userId, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined
      })

      toast({
        title: "Perfil completado",
        description: "Tu cuenta y negocio han sido configurados exitosamente",
      })

      router.push(ROUTES.DASHBOARD)
    } catch (error: any) {
      toast({
        title: "Error",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const steps = [
    { number: 1, title: 'Datos personales', icon: User },
    { number: 2, title: 'Tu negocio', icon: Building2 },
    { number: 3, title: 'Primera ubicación', icon: MapPin },
  ]

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Completa tu perfil</h1>
            <p className="text-gray-600">
              Configura tu negocio para comenzar
            </p>
            {userEmail && (
              <p className="text-sm text-blue-600">
                {userEmail}
              </p>
            )}
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-2">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                  ${currentStep >= step.number
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-400'}
                `}>
                  {currentStep > step.number ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-1 mx-1 rounded ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Title */}
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {steps[currentStep - 1].title}
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Personal Data */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="firstName"
                        type="text"
                        required
                        className="pl-10 h-12"
                        placeholder="Tu nombre"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="lastName"
                        type="text"
                        required
                        className="pl-10 h-12"
                        placeholder="Tu apellido"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono (opcional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      className="pl-10 h-12"
                      placeholder="(555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Business Data */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <p className="text-sm text-blue-800">
                      Ingresa los datos de tu negocio. Serás el administrador principal.
                    </p>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Nombre del negocio *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="businessName"
                      type="text"
                      required
                      className="pl-10 h-12"
                      placeholder="Mi Papelería"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessTaxId">RFC (opcional)</Label>
                  <Input
                    id="businessTaxId"
                    type="text"
                    className="h-12"
                    placeholder="XAXX010101000"
                    value={formData.businessTaxId}
                    onChange={(e) => handleInputChange('businessTaxId', e.target.value.toUpperCase())}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Giro del negocio</Label>
                  <Input
                    id="businessType"
                    type="text"
                    className="h-12"
                    placeholder="Papelería, Abarrotes, etc."
                    value={formData.businessType}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Location Data */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <p className="text-sm text-green-800">
                      Configura tu primera sucursal o punto de venta.
                    </p>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label htmlFor="locationName">Nombre de la sucursal *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="locationName"
                      type="text"
                      required
                      className="pl-10 h-12"
                      placeholder="Sucursal Centro"
                      value={formData.locationName}
                      onChange={(e) => handleInputChange('locationName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locationAddress">Dirección</Label>
                  <Input
                    id="locationAddress"
                    type="text"
                    className="h-12"
                    placeholder="Calle, número, colonia"
                    value={formData.locationAddress}
                    onChange={(e) => handleInputChange('locationAddress', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="locationCity">Ciudad</Label>
                    <Input
                      id="locationCity"
                      type="text"
                      className="h-12"
                      placeholder="Ciudad"
                      value={formData.locationCity}
                      onChange={(e) => handleInputChange('locationCity', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationState">Estado</Label>
                    <Input
                      id="locationState"
                      type="text"
                      className="h-12"
                      placeholder="Estado"
                      value={formData.locationState}
                      onChange={(e) => handleInputChange('locationState', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="locationPostalCode">CP</Label>
                    <Input
                      id="locationPostalCode"
                      type="text"
                      className="h-12"
                      placeholder="12345"
                      value={formData.locationPostalCode}
                      onChange={(e) => handleInputChange('locationPostalCode', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationPhone">Teléfono</Label>
                    <Input
                      id="locationPhone"
                      type="tel"
                      className="h-12"
                      placeholder="(555) 123-4567"
                      value={formData.locationPhone}
                      onChange={(e) => handleInputChange('locationPhone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Anterior
                </Button>
              )}

              {currentStep < 3 ? (
                <Button
                  type="button"
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
                  onClick={handleNext}
                >
                  Siguiente
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Guardando...</span>
                    </div>
                  ) : (
                    <span>Completar configuración</span>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
