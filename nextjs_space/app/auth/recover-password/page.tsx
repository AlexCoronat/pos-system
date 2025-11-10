
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react'

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const { resetPassword } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      await resetPassword(email)
      setIsSuccess(true)
      toast({
        title: "Recovery email sent!",
        description: "Please check your email for password recovery instructions.",
      })
    } catch (error: any) {
      toast({
        title: "Recovery failed",
        description: error.message || "Failed to send recovery email",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Check your email</h1>
          <p className="text-gray-600 max-w-md mx-auto">
            We&apos;ve sent password recovery instructions to{' '}
            <span className="font-medium text-gray-900">{email}</span>
          </p>
        </div>

        {/* Recovery Illustration */}
        <div className="flex justify-center py-8">
          <div className="relative w-64 h-48 rounded-2xl overflow-hidden">
            <Image
              src="https://cdn.abacus.ai/images/9ca2f93b-050e-4a64-8e1e-8a5cd6b926ed.jpg"
              alt="Email sent"
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Check your email inbox (and spam folder)</li>
              <li>• Click the recovery link in the email</li>
              <li>• Create a new password</li>
              <li>• Sign in with your new password</li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => {
                setIsSuccess(false)
                setEmail('')
              }}
              variant="outline"
              className="w-full h-12"
            >
              Send another email
            </Button>

            <Link href="/auth/login">
              <Button variant="ghost" className="w-full h-12">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
            <Image
              src="https://cdn.abacus.ai/images/9ca2f93b-050e-4a64-8e1e-8a5cd6b926ed.jpg"
              alt="Password Recovery"
              width={32}
              height={32}
              className="rounded-lg"
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Forgot password?</h1>
        <p className="text-gray-600">
          No worries, we&apos;ll send you reset instructions
        </p>
      </div>

      {/* Recovery Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email address
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
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">
              We&apos;ll send a recovery link to this email address
            </p>
          </div>
        </div>

        {/* Recovery Button */}
        <Button
          type="submit"
          className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Sending recovery email...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Send recovery email</span>
            </div>
          )}
        </Button>
      </form>

      {/* Back to Login */}
      <div className="text-center">
        <Link 
          href="/auth/login" 
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sign in
        </Link>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Need help?</h3>
        <p className="text-sm text-gray-600 mb-3">
          If you&apos;re still having trouble accessing your account, you can:
        </p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Contact your system administrator</li>
          <li>• Check your spam/junk folder for the recovery email</li>
          <li>• Try signing in with a different email address</li>
        </ul>
      </div>
    </div>
  )
}
