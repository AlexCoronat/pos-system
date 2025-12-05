'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { ThemeToggle } from './ThemeToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export function AdminHeader() {
    const { user } = useAuth()

    // Get time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Buenos días'
        if (hour < 19) return 'Buenas tardes'
        return 'Buenas noches'
    }

    return (
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div>
                <h1 className="text-xl font-semibold text-gray-900">
                    {getGreeting()}, {user?.firstName}
                </h1>
                <p className="text-sm text-gray-500">
                    Bienvenido de vuelta a tu dashboard
                </p>
            </div>

            <div className="flex items-center gap-3">
                {/* Notifications */}
                <NotificationBell />

                {/* Theme Toggle */}
                <ThemeToggle />
            </div>
        </div>
    )
}
