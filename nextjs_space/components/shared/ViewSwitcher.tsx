/**
 * View Switcher Component
 * Button to toggle between Admin and Seller views
 * Only visible to users with permission to switch
 */

'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useViewStore, useCanSwitchView, useEffectiveView } from '@/lib/stores/view-store'
import { BrandButton } from '@/components/shared'
import { ArrowLeftRight } from 'lucide-react'

interface ViewSwitcherProps {
    className?: string
    variant?: 'default' | 'sidebar'
}

export function ViewSwitcher({ className = '', variant = 'default' }: ViewSwitcherProps) {
    const router = useRouter()
    const canSwitchView = useCanSwitchView()
    const effectiveView = useEffectiveView()
    const { toggleView, setIsTransitioning } = useViewStore()

    const handleSwitch = useCallback(() => {
        setIsTransitioning(true)

        const newView = toggleView()

        // Navigate to appropriate route
        setTimeout(() => {
            if (newView === 'admin') {
                router.push('/dashboard')
            } else {
                router.push('/pos')
            }

            setTimeout(() => {
                setIsTransitioning(false)
            }, 300)
        }, 100)
    }, [toggleView, router, setIsTransitioning])

    // Don't render if user can't switch views
    if (!canSwitchView) {
        return null
    }

    const targetView = effectiveView === 'admin' ? 'Vendedor' : 'Admin'
    const currentViewLabel = effectiveView === 'admin' ? 'Modo Admin' : 'Modo Vendedor'

    if (variant === 'sidebar') {
        return (
            <button
                onClick={handleSwitch}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${effectiveView === 'admin'
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
                    } hover:opacity-90 ${className}`}
            >
                <ArrowLeftRight className="w-5 h-5" />
                <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{currentViewLabel}</div>
                    <div className="text-xs opacity-80">Cambiar a {targetView}</div>
                </div>
            </button>
        )
    }

    return (
        <BrandButton
            onClick={handleSwitch}
            variant="outline"
            className={`gap-2 ${className}`}
        >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Cambiar a {targetView}</span>
        </BrandButton>
    )
}
