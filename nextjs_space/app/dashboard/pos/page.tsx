/**
 * POS Page
 * Point of Sale interface for sellers
 */

'use client'

import { useState, useEffect } from 'react'
import { ProductSearch } from '@/components/pos/ProductSearch'
import { CategoryTabs } from '@/components/pos/CategoryTabs'
import { QuickProducts } from '@/components/pos/QuickProducts'
import { ProductGrid } from '@/components/pos/ProductGrid'
import { ServicesGrid } from '@/components/pos/ServicesGrid'
import { CartPanel } from '@/components/pos/CartPanel'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { OpenShiftModal } from '@/components/pos/OpenShiftModal'
import { CloseShiftModal } from '@/components/pos/CloseShiftModal'
import { AddMovementModal } from '@/components/pos/AddMovementModal'
import { ShiftReport } from '@/components/pos/ShiftReport'
import { CashReconciliationModal } from '@/components/pos/CashReconciliationModal'
import { useShiftStore } from '@/lib/stores/shift-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { useShiftModals } from '@/lib/contexts/shift-modals-context'
import { usePOSLayoutConfig } from '@/lib/stores/pos-layout-config-store'
import { useShiftConfig } from '@/lib/stores/shift-config-store'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'
import { BrandButton } from '@/components/shared'
import { Loader2, Clock, AlertCircle } from 'lucide-react'

export default function POSPage() {
    const { currentShift, loadCurrentShift, isLoading: isLoadingShift } = useShiftStore()
    const { items, clearCart } = useCartStore()
    const shiftModals = useShiftModals()
    const { config: layoutConfig, isLoading: isLoadingLayoutConfig } = usePOSLayoutConfig()
    const { config: shiftConfig, isLoading: isLoadingShiftConfig } = useShiftConfig()
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    // Load current shift on mount
    useEffect(() => {
        loadCurrentShift()
    }, [loadCurrentShift])

    // Determine if POS should be blocked (shifts enabled but no shift open)
    const isPOSBlocked = shiftConfig.shiftsEnabled && !currentShift && !isLoadingShift

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false)
        setRefreshKey(prev => prev + 1)
    }

    const handleShiftClosed = (shiftId: number) => {
        shiftModals.setReportShiftId(shiftId)
        shiftModals.setShowShiftReport(true)
    }

    // Global POS shortcuts
    useKeyboardShortcuts({
        shortcuts: [
            {
                key: 'Escape',
                handler: () => {
                    // Clear cart if no modals are open
                    if (!showPaymentModal && !shiftModals.showOpenShiftModal && !shiftModals.showCloseShiftModal && !shiftModals.showMovementModal && !shiftModals.showShiftReport && !shiftModals.showCashReconciliation) {
                        if (items.length > 0 && confirm('¿Limpiar el carrito?')) {
                            clearCart()
                        }
                    }
                },
                description: 'Limpiar carrito'
            }
        ],
        enabled: !isPOSBlocked
    })

    // Get CSS classes based on layout split config
    const getLayoutClasses = () => {
        switch (layoutConfig.layoutSplit) {
            case '50-50':
                return { products: 'lg:w-1/2', cart: 'lg:w-1/2 lg:min-w-[350px]' }
            case '60-40':
                return { products: 'lg:w-3/5', cart: 'lg:w-2/5 lg:min-w-[350px]' }
            case '70-30':
            default:
                return { products: 'lg:flex-1', cart: 'lg:w-[350px]' }
        }
    }

    const layoutClasses = getLayoutClasses()

    // Show loading state while config loads
    if (isLoadingLayoutConfig || isLoadingShiftConfig || isLoadingShift) {
        return (
            <div className="-m-6 h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        )
    }

    // Show blocking overlay if shifts are required but no shift is open
    if (isPOSBlocked) {
        return (
            <div className="-m-6 h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-100">
                <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md mx-4">
                    <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
                        <Clock className="h-10 w-10 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Turno Requerido
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Debes abrir un turno para poder realizar ventas.
                        Esto permite llevar un control de caja y generar reportes.
                    </p>
                    <BrandButton
                        size="lg"
                        onClick={() => shiftModals.openOpenShiftModal()}
                        className="w-full"
                    >
                        <Clock className="h-5 w-5 mr-2" />
                        Abrir Turno
                    </BrandButton>
                    <p className="text-xs text-gray-400 mt-4">
                        Configurado desde Ajustes → Configuración de Turnos
                    </p>
                </div>

                {/* Open Shift Modal */}
                <OpenShiftModal
                    isOpen={shiftModals.showOpenShiftModal}
                    onClose={shiftModals.closeAllModals}
                    onSuccess={() => {
                        loadCurrentShift()
                        setRefreshKey(prev => prev + 1)
                    }}
                />
            </div>
        )
    }

    return (
        <div className="-m-6 h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-gray-50">
            {/* Main Content Area */}
            <div className={`flex-1 ${layoutClasses.products} flex flex-col overflow-hidden`}>
                {/* Top Bar with Search */}
                {layoutConfig.showSearchBar && (
                    <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
                        <ProductSearch />
                    </div>
                )}

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Category Filters - only shown if products grid is also enabled */}
                    {layoutConfig.showCategoryFilter && layoutConfig.showAllProducts && (
                        <div>
                            <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                Categorías
                            </h2>
                            <CategoryTabs
                                selectedCategory={selectedCategory}
                                onCategoryChange={setSelectedCategory}
                            />
                        </div>
                    )}

                    {/* Quick Products */}
                    {layoutConfig.showQuickProducts && (
                        <QuickProducts key={`quick-${refreshKey}`} />
                    )}

                    {/* Services Section */}
                    {layoutConfig.showServices && (
                        <ServicesGrid key={`services-${refreshKey}`} />
                    )}

                    {/* All Products Grid */}
                    {layoutConfig.showAllProducts && (
                        <div>
                            <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                                {selectedCategory === null ? 'Todos los Productos' : 'Productos Filtrados'}
                            </h2>
                            <ProductGrid categoryId={selectedCategory} key={`grid-${refreshKey}-${selectedCategory}`} />
                        </div>
                    )}

                    {/* Empty state if nothing is shown */}
                    {!layoutConfig.showCategoryFilter && !layoutConfig.showQuickProducts && !layoutConfig.showServices && !layoutConfig.showAllProducts && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                                <p>No hay componentes visibles</p>
                                <p className="text-sm">Configura el layout en Ajustes → Layout POS</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Cart Panel - Fixed on Desktop, Modal on Mobile */}
            <div className={`hidden lg:flex flex-shrink-0 h-full ${layoutClasses.cart}`}>
                <CartPanel onCheckout={() => setShowPaymentModal(true)} />
            </div>

            <div className="lg:hidden fixed bottom-4 right-4">
                <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-6 py-3 rounded-full shadow-lg text-white font-medium hover:opacity-90 transition-colors"
                    style={{ backgroundColor: 'var(--color-primary, #3B82F6)' }}
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

            {/* Shift Modals - Controlled by context */}
            <OpenShiftModal
                isOpen={shiftModals.showOpenShiftModal}
                onClose={shiftModals.closeAllModals}
                onSuccess={() => setRefreshKey(prev => prev + 1)}
            />
            <CloseShiftModal
                isOpen={shiftModals.showCloseShiftModal}
                onClose={shiftModals.closeAllModals}
                onSuccess={handleShiftClosed}
            />

            {/* Cash Movement Modal */}
            {currentShift && (
                <AddMovementModal
                    isOpen={shiftModals.showMovementModal}
                    onClose={shiftModals.closeAllModals}
                    onSuccess={() => setRefreshKey(prev => prev + 1)}
                    shiftId={currentShift.id}
                />
            )}

            {/* Cash Reconciliation Modal */}
            <CashReconciliationModal
                isOpen={shiftModals.showCashReconciliation}
                onClose={shiftModals.closeAllModals}
            />

            {/* Shift Report */}
            {shiftModals.reportShiftId && (
                <ShiftReport
                    isOpen={shiftModals.showShiftReport}
                    onClose={() => {
                        shiftModals.setShowShiftReport(false)
                        shiftModals.setReportShiftId(null)
                    }}
                    shiftId={shiftModals.reportShiftId}
                />
            )}
        </div>
    )
}



