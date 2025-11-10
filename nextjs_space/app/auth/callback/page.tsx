'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authService } from '@/lib/services/auth.service'
import { useToast } from '@/hooks/use-toast'
import { ROUTES, MESSAGES } from '@/lib/constants'
import { getUserFriendlyMessage } from '@/lib/utils/error-handler'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient()

        // Get the session from Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (!session?.user) {
          throw new Error('No session found')
        }

        // Handle OAuth callback in auth service
        const result = await authService.handleOAuthCallback(
          session.user.id,
          session.user.email || ''
        )

        if (result.needsProfileCompletion) {
          // Redirect to complete profile page
          setStatus('success')
          router.push(ROUTES.AUTH.COMPLETE_PROFILE)
        } else {
          // Profile is complete, redirect to dashboard
          setStatus('success')
          toast(MESSAGES.AUTH.LOGIN_SUCCESS)
          router.push(ROUTES.DASHBOARD)
        }
      } catch (error: any) {
        console.error('Auth callback error:', error)
        setStatus('error')
        toast({
          ...MESSAGES.AUTH.OAUTH_FAILED,
          description: getUserFriendlyMessage(error),
          variant: "destructive",
        })
        // Redirect to login page after a delay
        setTimeout(() => {
          router.push(ROUTES.AUTH.LOGIN)
        }, 3000)
      }
    }

    handleCallback()
  }, [router, toast])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-900">Completing sign in...</h2>
              <p className="mt-2 text-gray-600">Please wait while we set up your account.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Success!</h2>
              <p className="mt-2 text-gray-600">Redirecting you now...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
              <p className="mt-2 text-gray-600">Redirecting you to login page...</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
