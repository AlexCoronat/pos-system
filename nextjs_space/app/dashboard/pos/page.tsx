/**
 * POS Page
 * Point of Sale interface for sellers
 */

'use client'

import { useState, useRef } from 'react'
import { ProductSearch } from '@/components/pos/ProductSearch'
import { CategoryTabs } from '@/components/pos/CategoryTabs'
import { QuickProducts } from '@/components/pos/QuickProducts'
import { ProductGrid } from '@/components/pos/ProductGrid'
import { CartPanel } from '@/components/pos/CartPanel'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { ShiftStatus } from '@/components/pos/ShiftStatus'
import { OpenShiftModal } from '@/components/pos/OpenShiftModal'
import { CloseShiftModal } from '@/components/pos/CloseShiftModal'
import { AddMovementModal } from '@/components/pos/AddMovementModal'
import { ShiftReport } from '@/components/pos/ShiftReport'
import { useShiftStore } from '@/lib/stores/shift-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'

export default function POSPage() {
    const { currentShift } = useShiftStore()
    const { items, clearCart } = useCartStore()
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showOpenShiftModal, setShowOpenShiftModal] = useState(false)
    const [showCloseShiftModal, setShowCloseShiftModal] = useState(false)
    const [showMovementModal, setShowMovementModal] = useState(false)
    const [showShiftReport, setShowShiftReport] = useState(false)
    const [reportShiftId, setReportShiftId] = useState<number | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false)
        setRefreshKey(prev => prev + 1)
    }

    const handleShiftClosed = (shiftId: number) => {
        setReportShiftId(shiftId)
        setShowShiftReport(true)
    }

    // Global POS shortcuts
    useKeyboardShortcuts({
        shortcuts: [
            {
                key: 'Escape',
                handler: () => {
                    // Clear cart if no modals are open
                    if (!showPaymentModal && !showOpenShiftModal && !showCloseShiftModal && !showMovementModal && !showShiftReport) {
                        if (items.length > 0 && confirm('¿Limpiar el carrito?')) {
                            clearCart()
                        }
                    }
                },
                description: 'Limpiar carrito'
            }
        ],
        enabled: true
    })

    return (
        <div className="-m-6 h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-gray-50">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar with Search and Shift Status */}
                <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <ProductSearch />
                        </div>
                        <ShiftStatus
                            onOpenShift={() => setShowOpenShiftModal(true)}
                            onCloseShift={() => setShowCloseShiftModal(true)}
                            onAddMovement={() => setShowMovementModal(true)}
                        />
                    </div>
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
            <div className="hidden lg:block flex-shrink-0">
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

            {/* Shift Modals */}
            <OpenShiftModal
                isOpen={showOpenShiftModal}
                onClose={() => setShowOpenShiftModal(false)}
                onSuccess={() => setRefreshKey(prev => prev + 1)}
            />
            <CloseShiftModal
                isOpen={showCloseShiftModal}
                onClose={() => setShowCloseShiftModal(false)}
                onSuccess={handleShiftClosed}
            />

            {/* Cash Movement Modal */}
            {currentShift && (
                <AddMovementModal
                    isOpen={showMovementModal}
                    onClose={() => setShowMovementModal(false)}
                    onSuccess={() => setRefreshKey(prev => prev + 1)}
                    shiftId={currentShift.id}
                />
            )}

            {/* Shift Report */}
            {reportShiftId && (
                <ShiftReport
                    isOpen={showShiftReport}
                    onClose={() => {
                        setShowShiftReport(false)
                        setReportShiftId(null)
                    }}
                    shiftId={reportShiftId}
                />
            )}
        </div>
    )
}
