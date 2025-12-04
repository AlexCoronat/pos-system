
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'
import { BrandButton } from '@/components/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Store, 
  BarChart3, 
  Users, 
  Package, 
  CreditCard,
  Shield,
  Globe,
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null // Will redirect to dashboard
  }

  const features = [
    {
      icon: Store,
      title: "Multi-Location Management",
      description: "Manage multiple store locations from a single, unified platform with location-specific inventory and sales tracking."
    },
    {
      icon: Package,
      title: "Smart Inventory Control",
      description: "Real-time inventory tracking with automatic low-stock alerts, reorder points, and comprehensive product management."
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Detailed sales reports, performance metrics, and business insights to help you make data-driven decisions."
    },
    {
      icon: Users,
      title: "Customer Management",
      description: "Complete customer database with purchase history, loyalty programs, and personalized service capabilities."
    },
    {
      icon: CreditCard,
      title: "Flexible Payment Processing",
      description: "Accept cash, cards, and digital payments including Mercado Pago integration for seamless transactions."
    },
    {
      icon: Shield,
      title: "Role-Based Access Control",
      description: "Secure user management with customizable roles and permissions for different staff levels and responsibilities."
    }
  ]

  const benefits = [
    "Streamline daily operations and reduce manual work",
    "Increase sales with better customer insights",
    "Prevent stockouts with smart inventory alerts",
    "Make informed decisions with real-time analytics",
    "Scale your business across multiple locations",
    "Ensure data security with advanced user controls"
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Store className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">POS System</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <BrandButton variant="outline">
                  Sign In
                </BrandButton>
              </Link>
              <Link href="/auth/register">
                <BrandButton>
                  Get Started
                </BrandButton>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-green-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                  Modern Point of Sale
                  <span className="block text-green-300">System</span>
                </h1>
                <p className="text-xl text-blue-100 max-w-lg">
                  Streamline your retail operations with our comprehensive POS solution. 
                  Manage inventory, process sales, and track performance across multiple locations.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/register">
                  <BrandButton size="lg" className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white">
                    <Zap className="w-5 h-5 mr-2" />
                    Start Free Trial
                  </BrandButton>
                </Link>
                <Link href="/auth/login">
                  <BrandButton size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Sign In
                  </BrandButton>
                </Link>
              </div>

              <div className="flex items-center space-x-6 text-sm text-blue-200">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-300" />
                  No setup fees
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-300" />
                  Cancel anytime
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-300" />
                  24/7 support
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative w-full h-96 rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="https://cdn.abacus.ai/images/2c67362c-89b6-4047-9854-4185bb075854.jpg"
                  alt="Modern POS System Interface"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Everything you need to run your business
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our comprehensive POS system provides all the tools you need to manage 
              your retail operations efficiently and effectively.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl text-gray-900">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600 text-center leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Why choose our POS system?
                </h2>
                <p className="text-lg text-gray-600">
                  Built specifically for modern retail businesses, our POS system 
                  combines powerful features with intuitive design to help you succeed.
                </p>
              </div>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Link href="/auth/register">
                  <BrandButton size="lg" className="bg-blue-600 hover:bg-blue-700">
                    Get Started Today
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </BrandButton>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-green-100 rounded-2xl p-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-6 text-center shadow-md">
                    <Globe className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-gray-900">Multi-Location</div>
                    <div className="text-sm text-gray-600">Support</div>
                  </div>
                  <div className="bg-white rounded-lg p-6 text-center shadow-md">
                    <Shield className="w-8 h-8 text-green-600 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-gray-900">Secure</div>
                    <div className="text-sm text-gray-600">& Reliable</div>
                  </div>
                  <div className="bg-white rounded-lg p-6 text-center shadow-md">
                    <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-gray-900">Real-time</div>
                    <div className="text-sm text-gray-600">Analytics</div>
                  </div>
                  <div className="bg-white rounded-lg p-6 text-center shadow-md">
                    <Zap className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-gray-900">Lightning</div>
                    <div className="text-sm text-gray-600">Fast</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to transform your business?
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Join thousands of businesses already using our POS system to streamline 
            operations and boost sales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <BrandButton size="lg" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-100">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </BrandButton>
            </Link>
            <Link href="/auth/login">
              <BrandButton size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10">
                Sign In
              </BrandButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Store className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold text-white">POS System</span>
            </div>
            <p className="text-gray-400">
              Complete point of sale solution for modern retail businesses.
            </p>
            <div className="text-sm text-gray-500">
              © 2025 POS System. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
