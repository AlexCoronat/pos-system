/**
 * POS Page
 * Point of Sale interface for sellers
 */

'use client'

import { useState } from 'react'
import { ProductSearch } from '@/components/pos/ProductSearch'
import { CategoryTabs } from '@/components/pos/CategoryTabs'
import { QuickProducts } from '@/components/pos/QuickProducts'
import { ProductGrid } from '@/components/pos/ProductGrid'
import { CartPanel } from '@/components/pos/CartPanel'
import { PaymentModal } from '@/components/pos/PaymentModal'

export default function POSPage() {
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false)
        // Trigger products reload by changing key
        setRefreshKey(prev => prev + 1)
    }

    return (
        <div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-gray-50">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar with Search */}
                <div className="bg-white border-b border-gray-200 p-4">
                    <ProductSearch />
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Category Filters */}
                    <div>
                        <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                            Categorías
                        </h2>
                        <CategoryTabs
                            selectedCategory={selectedCategory}
                            onCategoryChange={setSelectedCategory}
                        />
                    </div>

                    {/* Quick Products - refreshKey forces reload */}
                    <QuickProducts key={`quick-${refreshKey}`} />

                    {/* Products Grid - refreshKey forces reload */}
                    <div>
                        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                            {selectedCategory === null ? 'Todos los Productos' : 'Productos Filtrados'}
                        </h2>
                        <ProductGrid categoryId={selectedCategory} key={`grid-${refreshKey}-${selectedCategory}`} />
                    </div>
                </div>
            </div>

            {/* Cart Panel - Fixed on Desktop, Modal on Mobile */}
            <div className="hidden lg:block">
                <CartPanel onCheckout={() => setShowPaymentModal(true)} />
            </div>

            {/* Mobile Cart Button */}
            <div className="lg:hidden fixed bottom-4 right-4">
                <button
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-all"
                >
                    Ver Carrito
                </button>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSuccess={handlePaymentSuccess}
            />
        </div>
    )
}
