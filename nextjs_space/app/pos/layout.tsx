/**
 * POS Layout
 * Minimal layout for seller view with icon-only sidebar
 */

import { ReactNode } from 'react'
import { POSSidebar } from '@/components/pos/POSSidebar'

interface POSLayoutProps {
    children: ReactNode
}

export default function POSLayout({ children }: POSLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Minimal sidebar */}
            <POSSidebar />

            {/* Main content - full height, no header */}
            <div className="ml-16">
                {children}
            </div>
        </div>
    )
}
