/**
 * POS Sidebar Component
 * Minimal icon-only sidebar for seller view
 */

'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { useCanSwitchView } from '@/lib/stores/view-store'
import { ViewSwitcher } from '@/components/shared/ViewSwitcher'
import {
    ShoppingCart,
    History,
    User,
    LogOut
} from 'lucide-react'

interface NavItem {
    name: string
    href: string
    icon: any
}

const navigationItems: NavItem[] = [
    { name: 'Ventas', href: '/pos', icon: ShoppingCart },
    { name: 'Historial', href: '/pos/history', icon: History },
    { name: 'Perfil', href: '/pos/profile', icon: User },
]

export function POSSidebar() {
    const pathname = usePathname()
    const { logout } = useAuth()
    const canSwitchView = useCanSwitchView()

    const handleLogout = async () => {
        await logout()
        window.location.href = '/auth/login'
    }

    return (
        <div className="fixed inset-y-0 left-0 w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 z-50">
            {/* Logo */}
            <Link href="/pos" className="mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                    <ShoppingCart className="w-6 h-6 text-white" />
                </div>
            </Link>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-2 w-full px-2">
                {navigationItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/pos' && pathname.startsWith(item.href))
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`
                flex items-center justify-center w-12 h-12 rounded-xl transition-all
                ${isActive
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }
              `}
                            title={item.name}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : ''}`} />
                        </Link>
                    )
                })}
            </nav>

            {/* ViewSwitcher - only if user can switch */}
            {canSwitchView && (
                <div className="mb-2">
                    <ViewSwitcher variant="sidebar" className="w-12 h-12 p-0 flex items-center justify-center" />
                </div>
            )}

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                title="Cerrar sesión"
            >
                <LogOut className="w-5 h-5" />
            </button>
        </div>
    )
}
