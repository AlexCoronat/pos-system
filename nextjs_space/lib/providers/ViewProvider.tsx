/**
 * View Provider
 * Initializes and manages view state across the application
 */

'use client'

import { useEffect, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { useViewStore, ViewType } from '@/lib/stores/view-store'

interface ViewProviderProps {
    children: ReactNode
}

export function ViewProvider({ children }: ViewProviderProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, hasRole, initialized, loading } = useAuth()
    const { setUserRole, setCanSwitchView, setEffectiveView, currentView } = useViewStore()

    // Initialize view state when user logs in
    useEffect(() => {
        if (!initialized || loading || !user) return

        const roleName = user.roleName || 'Seller'
        const canSwitch = hasRole('Admin', 'Manager', 'Supervisor')

        // Calculate effective view manually
        let effectiveView: ViewType
        if (currentView === 'admin' || currentView === 'seller') {
            effectiveView = currentView
        } else {
            effectiveView = ['Admin', 'Manager', 'Supervisor'].includes(roleName) ? 'admin' : 'seller'
        }

        // Update store (these won't trigger infinite loop now)
        setUserRole(roleName)
        setCanSwitchView(canSwitch)
        setEffectiveView(effectiveView)

        // Route protection
        if (!canSwitch && effectiveView === 'seller' && pathname?.startsWith('/dashboard')) {
            router.replace('/dashboard/pos')
        }

        // Auto-navigate from root
        if (pathname === '/') {
            router.replace(effectiveView === 'admin' ? '/dashboard' : '/dashboard/pos')
        }
    }, [initialized, loading, user?.id]) // Only re-run when init state or user changes

    // Handle view mode changes
    useEffect(() => {
        if (!initialized || loading || !user) return

        const userRole = user.roleName || 'Seller'
        let effectiveView: ViewType

        if (currentView === 'admin' || currentView === 'seller') {
            effectiveView = currentView
        } else {
            effectiveView = ['Admin', 'Manager', 'Supervisor'].includes(userRole) ? 'admin' : 'seller'
        }

        // Only redirect sellers away from non-POS dashboard routes
        // Allow admins to access all dashboard routes including /dashboard/pos
        if (effectiveView === 'seller' && pathname?.startsWith('/dashboard') && !pathname.startsWith('/dashboard/pos')) {
            router.push('/dashboard/pos')
        }
    }, [currentView, pathname]) // Only when view mode or path changes

    return <>{children}</>
}
