'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import { BrandButton } from '@/components/shared'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { AUTH_CONSTANTS, ROUTES } from '@/lib/constants'

export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { changePassword } = useAuth()
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

  const passwordStrength = getPasswordStrength(newPassword)
  const passwordStrengthText = [
    t('strength.veryWeak'),
    t('strength.weak'),
    t('strength.fair'),
    t('strength.good'),
    t('strength.strong')
  ][passwordStrength]
  const passwordStrengthColor = ['red', 'orange', 'yellow', 'blue', 'green'][passwordStrength]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!newPassword || !confirmPassword) {
      toast({
        title: t('errors.fillAllFields'),
        description: t('errors.fillAllFields'),
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t('errors.passwordsNotMatch'),
        description: t('errors.passwordsNotMatch'),
        variant: "destructive",
      })
      return
    }

    if (passwordStrength < 3 || newPassword.length < AUTH_CONSTANTS.PASSWORD.MIN_LENGTH) {
      toast({
        title: t('errors.weakPassword'),
        description: t('errors.weakPasswordMessage'),
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      await changePassword({
        newPassword,
        confirmPassword,
        currentPassword: '' // Not needed for password reset flow
      })

      setIsSuccess(true)
      toast({
        title: t('success.title'),
        description: t('success.message'),
      })

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push(ROUTES.AUTH.LOGIN)
      }, 3000)
    } catch (error: any) {
      toast({
        title: t('errors.resetFailed'),
        description: error.message || t('errors.resetFailedMessage'),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            {/* Success Header */}
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{t('success.title')}</h1>
              <p className="text-gray-600">
                {t('success.message')}
              </p>
            </div>

            {/* Redirect message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-700">
                {t('success.redirecting')}
              </p>
            </div>

            {/* Manual redirect button */}
            <Link href={ROUTES.AUTH.LOGIN}>
              <BrandButton className="w-full h-12">
                {t('success.goToLogin')}
              </BrandButton>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
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

          {/* Reset Password Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* New Password Field */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                  {t('newPassword')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder={t('newPasswordPlaceholder')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-full rounded-full bg-gray-200`}>
                        <div
                          className={`h-2 rounded-full transition-all duration-300 bg-${passwordStrengthColor}-500`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs text-${passwordStrengthColor}-600 font-medium`}>
                        {passwordStrengthText}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  {t('confirmPassword')}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    className={`pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''
                      }`}
                    placeholder={t('confirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {t('errors.passwordsNotMatch')}
                  </p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">{t('passwordRequirements')}</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                    • {t('requirement1')}
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>
                    • {t('requirement2')}
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>
                    • {t('requirement3')}
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                    • {t('requirement4')}
                  </li>
                  <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                    • {t('requirement5')}
                  </li>
                </ul>
              </div>
            </div>

            {/* Reset Button */}
            <BrandButton
              type="submit"
              className="w-full h-12"
              disabled={newPassword !== confirmPassword}
              isLoading={isLoading}
              loadingText={t('resettingPassword')}
            >
              {t('resetPassword')}
            </BrandButton>
          </form>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              href={ROUTES.AUTH.LOGIN}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              {t('backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
