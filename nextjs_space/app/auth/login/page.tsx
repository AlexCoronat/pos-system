
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/lib/hooks/use-auth'
import { LoginCredentials } from '@/lib/types/auth'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, Lock, Mail, LogIn } from 'lucide-react'
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton'
import { ROUTES, MESSAGES } from '@/lib/constants'
import { getUserFriendlyMessage } from '@/lib/utils/error-handler'

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

  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const { toast } = useToast()

  const redirectTo = searchParams?.get('redirectTo') || ROUTES.DASHBOARD

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
      toast(MESSAGES.AUTH.LOGIN_SUCCESS)
      console.log('Redirecting to:', redirectTo)
      router.push(redirectTo)
    } catch (error: any) {
      console.error('Login error caught:', error)
      toast({
        ...MESSAGES.AUTH.LOGIN_FAILED,
        description: getUserFriendlyMessage(error),
        variant: "destructive",
      })
    } finally {
      console.log('Finally block - setting loading to false')
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof LoginCredentials, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              {t('email')}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder={t('email')}
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
        <Button
          type="submit"
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>{tCommon('loading')}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <LogIn className="h-5 w-5" />
              <span>{t('signIn')}</span>
            </div>
          )}
        </Button>
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
