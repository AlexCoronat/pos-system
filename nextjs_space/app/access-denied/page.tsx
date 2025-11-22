'use client'

import Link from 'next/link'
import { ShieldX, Home, ArrowLeft, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/lib/hooks/use-auth'

export default function AccessDeniedPage() {
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldX className="h-10 w-10 text-red-500" />
            </div>

            {/* Title and Message */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-gray-900">403</h1>
              <h2 className="text-xl font-semibold text-gray-700">
                Acceso denegado
              </h2>
              <p className="text-muted-foreground">
                No tienes permisos para acceder a esta página.
                Contacta al administrador si crees que esto es un error.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Link href="/dashboard">
                <Button className="flex items-center gap-2 w-full">
                  <Home className="h-4 w-4" />
                  Ir al inicio
                </Button>
              </Link>
            </div>

            {/* Sign out option */}
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-red-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión e iniciar con otra cuenta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
