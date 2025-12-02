/**
 * Company Logo Component
 * Displays the company logo with fallback to company name
 */

'use client'

import { useBranding } from '@/lib/contexts/BrandingContext'
import { Building2 } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

interface CompanyLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
    showName?: boolean
    showSlogan?: boolean
}

const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24'
}

export function CompanyLogo({
    size = 'md',
    className = '',
    showName = false,
    showSlogan = false
}: CompanyLogoProps) {
    const { branding } = useBranding()
    const { user } = useAuth()

    const hasLogo = Boolean(branding.logoUrl)

    if (!hasLogo && !showName) {
        // Icono de fallback
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div
                    className={`${sizeClasses[size]} aspect-square rounded-lg flex items-center justify-center`}
                    style={{
                        backgroundColor: `${branding.primaryColor}20`,
                        color: branding.primaryColor
                    }}
                >
                    <Building2 className="w-1/2 h-1/2" />
                </div>
            </div>
        )
    }

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {hasLogo ? (
                <img
                    src={branding.logoUrl}
                    alt="Company Logo"
                    className={`${sizeClasses[size]} object-contain`}
                />
            ) : (
                <div
                    className={`${sizeClasses[size]} aspect-square rounded-lg flex items-center justify-center`}
                    style={{
                        backgroundColor: `${branding.primaryColor}20`,
                        color: branding.primaryColor
                    }}
                >
                    <Building2 className="w-1/2 h-1/2" />
                </div>
            )}

            {showName && (
                <div className="flex flex-col">
                    <span
                        className="font-bold text-lg"
                        style={{ color: branding.primaryColor }}
                    >
                        {user?.businessName || 'Mi Negocio'}
                    </span>
                    {showSlogan && branding.slogan && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {branding.slogan}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
