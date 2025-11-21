'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/lib/hooks/use-auth'
import { RegisterData } from '@/lib/types/auth'
import { useToast } from '@/hooks/use-toast'
import {
  Eye, EyeOff, Lock, Mail, User, Phone, UserPlus,
  Building2, MapPin, ArrowRight, ArrowLeft, Check
} from 'lucide-react'
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'
import { ROUTES, MESSAGES, AUTH_CONSTANTS } from '@/lib/constants'
import { getUserFriendlyMessage } from '@/lib/utils/error-handler'

type Step = 1 | 2 | 3

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    acceptTerms: false,
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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const { register } = useAuth()
  const { toast } = useToast()

  // Password strength validation
  const getPasswordStrength = (password: string) => {
    let score = 0
    if (password.length >= 8) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }

  const passwordStrength = getPasswordStrength(formData.password)
  const passwordStrengthText = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte'][passwordStrength]
  const passwordStrengthColor = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'][passwordStrength]

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      })
      return false
    }

    if (formData.password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      })
      return false
    }

    if (passwordStrength < 3 || formData.password.length < AUTH_CONSTANTS.PASSWORD.MIN_LENGTH) {
      toast({
        title: "Contraseña débil",
        description: "La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas y números",
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

    if (!formData.acceptTerms) {
      toast({
        title: "Términos requeridos",
        description: "Debes aceptar los términos y condiciones",
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
      await register(formData)
      toast({
        title: "Cuenta creada",
        description: "Tu cuenta y negocio han sido creados exitosamente",
      })
      router.push(ROUTES.DASHBOARD)
    } catch (error: any) {
      toast({
        title: "Error al registrar",
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof RegisterData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const steps = [
    { number: 1, title: 'Datos personales', icon: User },
    { number: 2, title: 'Tu negocio', icon: Building2 },
    { number: 3, title: 'Primera ubicación', icon: MapPin },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Crear cuenta</h1>
        <p className="text-gray-600">
          Configura tu sistema POS en minutos
        </p>
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
              <div className={`w-12 h-1 mx-2 rounded ${
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

      {/* Google OAuth - Only on step 1 */}
      {currentStep === 1 && (
        <>
          <GoogleOAuthButton mode="register" />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">O regístrate con email</span>
            </div>
          </div>
        </>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Personal Data */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Name Fields */}
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

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  className="pl-10 h-12"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>

            {/* Phone */}
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

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="pl-10 pr-10 h-12"
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {formData.password && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full">
                    <div
                      className={`h-2 rounded-full transition-all ${passwordStrengthColor}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">{passwordStrengthText}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className={`pl-10 pr-10 h-12 ${
                    confirmPassword && formData.password !== confirmPassword ? 'border-red-500' : ''
                  }`}
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {confirmPassword && formData.password !== confirmPassword && (
                <p className="text-sm text-red-600">Las contraseñas no coinciden</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Business Data */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-800">
                  Ingresa los datos de tu negocio. Serás el administrador principal con acceso total.
                </p>
              </CardContent>
            </Card>

            {/* Business Name */}
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

            {/* Tax ID */}
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

            {/* Business Type */}
            <div className="space-y-2">
              <Label htmlFor="businessType">Giro del negocio</Label>
              <Input
                id="businessType"
                type="text"
                className="h-12"
                placeholder="Papelería, Abarrotes, Farmacia, etc."
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
                  Configura tu primera sucursal o punto de venta. Podrás agregar más después.
                </p>
              </CardContent>
            </Card>

            {/* Location Name */}
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

            {/* Address */}
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

            {/* City and State */}
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

            {/* Postal Code and Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="locationPostalCode">Código Postal</Label>
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

            {/* Terms & Conditions */}
            <div className="flex items-start space-x-2 pt-4">
              <Checkbox
                id="accept-terms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => handleInputChange('acceptTerms', checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="accept-terms" className="text-sm text-gray-600 leading-relaxed">
                Acepto los{' '}
                <Link href={ROUTES.TERMS} className="font-medium text-blue-600 hover:text-blue-500">
                  Términos y Condiciones
                </Link>
                {' '}y la{' '}
                <Link href={ROUTES.PRIVACY} className="font-medium text-blue-600 hover:text-blue-500">
                  Política de Privacidad
                </Link>
              </Label>
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
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Creando cuenta...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5" />
                  <span>Crear cuenta</span>
                </div>
              )}
            </Button>
          )}
        </div>
      </form>

      {/* Login Link */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          ¿Ya tienes una cuenta?{' '}
          <Link
            href={ROUTES.AUTH.LOGIN}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  )
}
