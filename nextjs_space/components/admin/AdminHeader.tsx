/**
 * Admin Header Component
 * Top header for admin dashboard with greeting and quick actions
 */

'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { Bell, Settings } from 'lucide-react'
import Link from 'next/link'

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
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg relative transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Settings */}
                <Link href="/dashboard/settings">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                </Link>
            </div>
        </div>
    )
}
