/**
 * Reusable Page Header Component
 * Consistent header pattern across all pages
 */

import { ReactNode } from 'react'

interface PageHeaderProps {
    title: string
    subtitle?: string
    actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
                {subtitle && (
                    <p className="text-muted-foreground mt-1">{subtitle}</p>
                )}
            </div>
            {actions && (
                <div className="flex gap-2">
                    {actions}
                </div>
            )}
        </div>
    )
}
