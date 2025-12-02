/**
 * Reusable Loading State Component
 * Consistent loading indicator across all pages
 */

import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
    message?: string
    minHeight?: string
}

export function LoadingState({
    message = 'Cargando...',
    minHeight = 'min-h-[400px]'
}: LoadingStateProps) {
    return (
        <div className={`flex items-center justify-center ${minHeight}`}>
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">{message}</p>
            </div>
        </div>
    )
}
