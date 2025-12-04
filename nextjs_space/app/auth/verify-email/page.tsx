'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import { BrandButton } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/constants'
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react'

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<VerificationStatus>('loading')
  const [message, setMessage] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('auth.verifyEmail')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const supabase = createClient()

        // Get the token from URL (Supabase sends it as part of the hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const token = hashParams.get('access_token')
        const type = hashParams.get('type')

        if (!token || type !== 'email') {
          setStatus('error')
          setMessage(t('invalidLink'))
          return
        }

        // Verify the email
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email',
        })

        if (error) {
          if (error.message.includes('expired')) {
            setStatus('expired')
            setMessage(t('expiredMessage'))
          } else {
            setStatus('error')
            setMessage(error.message)
          }
          return
        }

        // Update email_verified in database
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('user_details')
            .update({ email_verified: true })
            .eq('id', user.id)
        }

        setStatus('success')
        setMessage(t('successMessage'))

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push(ROUTES.DASHBOARD)
        }, 3000)
      } catch (error: any) {
        console.error('Verification error:', error)
        setStatus('error')
        setMessage(error.message)
      }
    }

    verifyEmail()
  }, [router])

  const handleResendVerification = async () => {
    setResendLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) {
        throw new Error('No email found. Please log in again.')
      }

      // Resend verification email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      })

      if (error) throw error

      setMessage(t('resendSuccess'))
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{t('loading')}</h1>
              <p className="text-gray-600">
                {t('loadingMessage')}
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{t('success')}</h1>
              <p className="text-gray-600">{message}</p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  {t('successRedirect')}
                </p>
              </div>

              <Link href={ROUTES.DASHBOARD}>
                <BrandButton className="w-full h-12">
                  {t('goToDashboard')}
                </BrandButton>
              </Link>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{t('failed')}</h1>
              <p className="text-gray-600">{message}</p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  {t('failedMessage')}
                </p>
              </div>

              <div className="flex flex-col space-y-3">
                <Link href={ROUTES.AUTH.LOGIN}>
                  <BrandButton className="w-full h-12">
                    {t('backToLogin')}
                  </BrandButton>
                </Link>
              </div>
            </div>
          )}

          {/* Expired State */}
          {status === 'expired' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                  <Mail className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{t('expired')}</h1>
              <p className="text-gray-600">{message}</p>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-700">
                  {t('expiredInfo')}
                </p>
              </div>

              <div className="flex flex-col space-y-3">
                <BrandButton
                  onClick={handleResendVerification}
                  className="w-full h-12"
                  isLoading={resendLoading}
                  loadingText={t('sending')}
                >
                  {t('resendButton')}
                </BrandButton>

                <Link href={ROUTES.AUTH.LOGIN}>
                  <BrandButton variant="outline" className="w-full h-12">
                    {t('backToLogin')}
                  </BrandButton>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
