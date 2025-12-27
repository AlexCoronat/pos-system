/**
 * Admin Layout - New dashboard layout with collapsible sidebar
 */

'use client'

import { ReactNode } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { useSidebarCollapsed } from '@/lib/stores/view-store'
import { ShiftModalsProvider } from '@/lib/contexts/shift-modals-context'

interface AdminLayoutProps {
    children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const collapsed = useSidebarCollapsed()

    return (
        <ShiftModalsProvider>
            <div className="min-h-screen bg-gray-50">
                {/* Sidebar */}
                <AdminSidebar />

                {/* Main content area */}
                <div
                    className={`
              transition-all duration-300
              ${collapsed ? 'ml-20' : 'ml-64'}
            `}
                >
                    {/* Header */}
                    <AdminHeader />

                    {/* Page content */}
                    <main className="p-6">
                        {children}
                    </main>
                </div>
            </div>
        </ShiftModalsProvider>
    )
}

