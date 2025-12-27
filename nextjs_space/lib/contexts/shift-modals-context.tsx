'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface ShiftModalsContextType {
    showOpenShiftModal: boolean
    showCloseShiftModal: boolean
    showMovementModal: boolean
    showCashReconciliation: boolean
    showShiftReport: boolean
    reportShiftId: number | null
    openOpenShiftModal: () => void
    openCloseShiftModal: () => void
    openMovementModal: () => void
    openCashReconciliation: () => void
    closeAllModals: () => void
    setShowShiftReport: (show: boolean) => void
    setReportShiftId: (id: number | null) => void
}

const ShiftModalsContext = createContext<ShiftModalsContextType | undefined>(undefined)

export function ShiftModalsProvider({ children }: { children: ReactNode }) {
    const [showOpenShiftModal, setShowOpenShiftModal] = useState(false)
    const [showCloseShiftModal, setShowCloseShiftModal] = useState(false)
    const [showMovementModal, setShowMovementModal] = useState(false)
    const [showCashReconciliation, setShowCashReconciliation] = useState(false)
    const [showShiftReport, setShowShiftReport] = useState(false)
    const [reportShiftId, setReportShiftId] = useState<number | null>(null)

    const openOpenShiftModal = () => setShowOpenShiftModal(true)
    const openCloseShiftModal = () => setShowCloseShiftModal(true)
    const openMovementModal = () => setShowMovementModal(true)
    const openCashReconciliation = () => setShowCashReconciliation(true)

    const closeAllModals = () => {
        setShowOpenShiftModal(false)
        setShowCloseShiftModal(false)
        setShowMovementModal(false)
        setShowCashReconciliation(false)
    }

    return (
        <ShiftModalsContext.Provider
            value={{
                showOpenShiftModal,
                showCloseShiftModal,
                showMovementModal,
                showCashReconciliation,
                showShiftReport,
                reportShiftId,
                openOpenShiftModal,
                openCloseShiftModal,
                openMovementModal,
                openCashReconciliation,
                closeAllModals,
                setShowShiftReport,
                setReportShiftId
            }}
        >
            {children}
        </ShiftModalsContext.Provider>
    )
}

export function useShiftModals() {
    const context = useContext(ShiftModalsContext)
    if (context === undefined) {
        throw new Error('useShiftModals must be used within a ShiftModalsProvider')
    }
    return context
}
