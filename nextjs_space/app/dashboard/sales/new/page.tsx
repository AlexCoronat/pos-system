'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductSearch } from '@/components/sales/product-search'
import { ShoppingCart } from '@/components/sales/shopping-cart'
import { PaymentDialog } from '@/components/sales/payment-dialog'
import { useCartStore } from '@/lib/stores/cart-store'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewSalePage() {
  const router = useRouter()
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const { items } = useCartStore()

  // TODO: Get location from user context/settings
  const locationId = 1

  const handleCheckout = () => {
    if (items.length === 0) {
      return
    }
    setPaymentDialogOpen(true)
  }

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false)
    // Redirect to sales list or show success message
    router.push('/dashboard/sales')
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/sales">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Nueva Venta</h1>
              <p className="text-sm text-muted-foreground">
                Busca y agrega productos al carrito
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 h-full">
          {/* Left Side - Product Search */}
          <div className="lg:col-span-2 space-y-4 overflow-y-auto">
            <ProductSearch
              locationId={locationId}
              onProductAdded={() => {
                // Optional: scroll to cart or show notification
              }}
            />

            {/* Quick Access / Recent Products (Optional) */}
            <div className="bg-accent/50 rounded-lg p-6 text-center text-muted-foreground">
              <p>
                Puedes buscar productos por nombre o código SKU
              </p>
              <p className="text-sm mt-2">
                Los productos se agregarán automáticamente al carrito
              </p>
            </div>
          </div>

          {/* Right Side - Shopping Cart */}
          <div className="lg:col-span-1">
            <ShoppingCart onCheckout={handleCheckout} />
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={handlePaymentSuccess}
        locationId={locationId}
      />
    </div>
  )
}
