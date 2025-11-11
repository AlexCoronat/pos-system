'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
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
          setMessage('Invalid verification link. Please check your email for the correct link.')
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
            setMessage('Verification link has expired. Please request a new one.')
          } else {
            setStatus('error')
            setMessage(error.message || 'Email verification failed.')
          }
          return
        }

        // Update email_verified in database
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('users')
            .update({ email_verified: true })
            .eq('id', user.id)
        }

        setStatus('success')
        setMessage('Your email has been successfully verified!')

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push(ROUTES.DASHBOARD)
        }, 3000)
      } catch (error: any) {
        console.error('Verification error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred during verification.')
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

      setMessage('Verification email sent! Please check your inbox.')
    } catch (error: any) {
      setMessage(error.message || 'Failed to resend verification email.')
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
              <h1 className="text-3xl font-bold text-gray-900">Verifying your email</h1>
              <p className="text-gray-600">
                Please wait while we verify your email address...
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
              <h1 className="text-3xl font-bold text-gray-900">Email verified!</h1>
              <p className="text-gray-600">{message}</p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  Redirecting you to the dashboard...
                </p>
              </div>

              <Link href={ROUTES.DASHBOARD}>
                <Button className="w-full h-12 bg-green-600 hover:bg-green-700">
                  Go to Dashboard
                </Button>
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
              <h1 className="text-3xl font-bold text-gray-900">Verification failed</h1>
              <p className="text-gray-600">{message}</p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  Please try again or contact support if the problem persists.
                </p>
              </div>

              <div className="flex flex-col space-y-3">
                <Link href={ROUTES.AUTH.LOGIN}>
                  <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700">
                    Back to Login
                  </Button>
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
              <h1 className="text-3xl font-bold text-gray-900">Link expired</h1>
              <p className="text-gray-600">{message}</p>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-700">
                  Verification links expire after 24 hours for security reasons.
                </p>
              </div>

              <div className="flex flex-col space-y-3">
                <Button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="w-full h-12 bg-orange-600 hover:bg-orange-700"
                >
                  {resendLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <span>Resend Verification Email</span>
                  )}
                </Button>

                <Link href={ROUTES.AUTH.LOGIN}>
                  <Button variant="outline" className="w-full h-12">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
