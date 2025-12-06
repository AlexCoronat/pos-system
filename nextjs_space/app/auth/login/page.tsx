
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import { BrandButton } from '@/components/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/lib/hooks/use-auth'
import { LoginCredentials } from '@/lib/types/auth'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, Lock, Mail, LogIn, Smartphone, ArrowLeft } from 'lucide-react'
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'
import { ROUTES, MESSAGES } from '@/lib/constants'
import { getUserFriendlyMessage } from '@/lib/utils/error-handler'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const t = useTranslations('auth.login')
  const tCommon = useTranslations('common')
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
    rememberMe: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // MFA States
  const [requiresMfa, setRequiresMfa] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  const redirectTo = searchParams?.get('redirectTo') || ROUTES.DASHBOARD

  // Check if redirected from callback for MFA verification
  useEffect(() => {
    const mfaParam = searchParams?.get('mfa')
    const factorIdParam = searchParams?.get('factorId')

    if (mfaParam === 'required' && factorIdParam) {
      console.log('MFA required from callback, factorId:', factorIdParam)
      setMfaFactorId(factorIdParam)
      setRequiresMfa(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('=== LOGIN FORM SUBMIT ===')

    if (!formData.email || !formData.password) {
      toast({
        ...MESSAGES.AUTH.MISSING_FIELDS,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    console.log('Loading state set to true')

    try {
      console.log('Calling login...')
      const user = await login(formData)
      console.log('Login returned successfully:', user)

      // Check if MFA is required
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
      console.log('MFA Factors:', factors, 'Error:', factorsError)

      if (!factorsError && factors?.totp && factors.totp.length > 0) {
        console.log('User has TOTP factors:', factors.totp)

        // User has MFA enabled - check if they need to verify
        const verifiedFactor = factors.totp.find(f => f.status === 'verified')
        console.log('Verified factor:', verifiedFactor)

        if (verifiedFactor) {
          // User has verified MFA, check assurance level
          const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
          console.log('AAL Data:', aalData, 'Error:', aalError)

          // If current level is aal1 and next level is aal2, we need MFA
          // OR if user has a verified factor, always require it for security
          if (aalData?.currentLevel === 'aal1') {
            console.log('Current AAL is aal1, requiring MFA verification')
            setMfaFactorId(verifiedFactor.id)
            setRequiresMfa(true)
            setIsLoading(false)
            return
          }
        }
      }

      // No MFA required, proceed normally
      toast(MESSAGES.AUTH.LOGIN_SUCCESS)
      console.log('Redirecting to:', redirectTo)
      router.push(redirectTo)
    } catch (error: any) {
      console.error('Login error caught:', error)

      // Check for forced password change
      if (error.message === 'FORCE_PASSWORD_CHANGE') {
        console.log('Redirecting to password change page')
        router.push('/auth/change-password')
        return
      }

      toast({
        ...MESSAGES.AUTH.LOGIN_FAILED,
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      })
    } finally {
      if (!requiresMfa) {
        console.log('Finally block - setting loading to false')
        setIsLoading(false)
      }
    }
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!mfaFactorId || mfaCode.length !== 6) {
      toast({
        title: "Código inválido",
        description: "Ingresa el código de 6 dígitos de tu aplicación",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Create MFA challenge and verify
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId
      })

      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode
      })

      if (verifyError) throw verifyError

      toast(MESSAGES.AUTH.LOGIN_SUCCESS)
      router.push(redirectTo)
    } catch (error: any) {
      console.error('MFA verification error:', error)
      toast({
        title: "Error de verificación",
        description: error.message || "Código inválido. Intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setRequiresMfa(false)
    setMfaCode('')
    setMfaFactorId(null)
  }

  const handleInputChange = (field: keyof LoginCredentials, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // MFA Verification Step
  if (requiresMfa) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Verificación 2FA</h1>
          <p className="text-gray-600">
            Ingresa el código de tu aplicación de autenticación
          </p>
        </div>

        {/* MFA Form */}
        <form onSubmit={handleMfaVerify} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code" className="text-sm font-medium text-gray-700">
                Código de verificación
              </Label>
              <Input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                className="h-14 text-center text-2xl tracking-widest font-mono border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
              />
              <p className="text-xs text-gray-500 text-center">
                Abre tu aplicación de autenticación (Google Authenticator, Authy, etc.)
              </p>
            </div>
          </div>

          {/* Verify Button */}
          <BrandButton
            type="submit"
            className="w-full h-12"
            isLoading={isLoading}
            loadingText="Verificando..."
            disabled={mfaCode.length !== 6}
          >
            <LogIn className="h-5 w-5 mr-2" />
            Verificar y Acceder
          </BrandButton>
        </form>

        {/* Back Button */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
            <Image
              src="https://cdn.abacus.ai/images/559a9b32-de85-4273-a1a0-d4349091d32d.jpg"
              alt={t('title')}
              width={32}
              height={32}
              className="rounded-lg"
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600">
          {t('subtitle')}
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Email or Username Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email o Usuario
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                required
                className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Email o Usuario"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              {t('password')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder={t('password')}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember-me"
              checked={formData.rememberMe}
              onCheckedChange={(checked) => handleInputChange('rememberMe', checked as boolean)}
            />
            <Label htmlFor="remember-me" className="text-sm text-gray-600">
              {t('rememberMe')}
            </Label>
          </div>

          <Link
            href={ROUTES.AUTH.RECOVER_PASSWORD}
            className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        {/* Login Button */}
        <BrandButton
          type="submit"
          className="w-full h-12"
          isLoading={isLoading}
          loadingText={tCommon('loading')}
        >
          <LogIn className="h-5 w-5 mr-2" />
          {t('signIn')}
        </BrandButton>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">{t('orContinueWith')}</span>
        </div>
      </div>

      {/* Google OAuth Button */}
      <GoogleOAuthButton mode="login" />

      {/* Register Link */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          {t('noAccount')}{' '}
          <Link
            href={ROUTES.AUTH.REGISTER}
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            {t('signUp')}
          </Link>
        </p>
      </div>
    </div>
  )
}
