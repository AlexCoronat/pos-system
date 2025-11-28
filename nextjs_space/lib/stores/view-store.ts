/**
 * View Store - Zustand
 * Manages the current view state (Admin vs Seller) and related UI preferences
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'admin' | 'seller' | 'auto'
export type ViewType = 'admin' | 'seller'

interface ViewState {
    currentView: ViewMode
    effectiveView: ViewType | null
    sidebarCollapsed: boolean
    isTransitioning: boolean
    userRole: string | null
    canSwitchView: boolean

    setCurrentView: (view: ViewMode) => void
    setEffectiveView: (view: ViewType | null) => void
    toggleSidebar: () => void
    setSidebarCollapsed: (collapsed: boolean) => void
    setUserRole: (role: string | null) => void
    setCanSwitchView: (canSwitch: boolean) => void
    setIsTransitioning: (transitioning: boolean) => void
    getEffectiveView: () => ViewType
    toggleView: () => ViewMode
}

export const useViewStore = create<ViewState>()(
    persist(
        (set, get) => ({
            currentView: 'auto',
            effectiveView: null,
            sidebarCollapsed: false,
            isTransitioning: false,
            userRole: null,
            canSwitchView: false,

            setCurrentView: (view) => set({ currentView: view }),
            setEffectiveView: (view) => set({ effectiveView: view }),
            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
            setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
            setUserRole: (role) => set({ userRole: role }),
            setCanSwitchView: (canSwitch) => set({ canSwitchView: canSwitch }),
            setIsTransitioning: (transitioning) => set({ isTransitioning: transitioning }),

            getEffectiveView: () => {
                const { currentView, userRole } = get()
                if (currentView === 'admin' || currentView === 'seller') {
                    return currentView
                }
                if (currentView === 'auto') {
                    if (userRole && ['Admin', 'Manager', 'Supervisor'].includes(userRole)) {
                        return 'admin'
                    }
                    return 'seller'
                }
                return 'seller'
            },

            toggleView: () => {
                const { effectiveView, canSwitchView } = get()
                if (!canSwitchView) {
                    console.warn('User does not have permission to switch views')
                    return get().currentView
                }
                const newView: ViewMode = effectiveView === 'admin' ? 'seller' : 'admin'
                set({ currentView: newView, effectiveView: newView })
                return newView
            },
        }),
        {
            name: 'pos-view-storage',
            partialize: (state) => ({
                currentView: state.currentView,
                sidebarCollapsed: state.sidebarCollapsed,
            }),
        }
    )
)

export const useCurrentView = () => useViewStore((state) => state.currentView)
export const useEffectiveView = () => useViewStore((state) => state.effectiveView)
export const useSidebarCollapsed = () => useViewStore((state) => state.sidebarCollapsed)
export const useCanSwitchView = () => useViewStore((state) => state.canSwitchView)
export const useIsTransitioning = () => useViewStore((state) => state.isTransitioning)
