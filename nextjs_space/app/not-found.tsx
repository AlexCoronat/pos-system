'use client'

import Link from 'next/link'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <FileQuestion className="h-10 w-10 text-gray-400" />
            </div>

            {/* Title and Message */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-gray-900">404</h1>
              <h2 className="text-xl font-semibold text-gray-700">
                Página no encontrada
              </h2>
              <p className="text-muted-foreground">
                Lo sentimos, la página que buscas no existe o ha sido movida.
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
