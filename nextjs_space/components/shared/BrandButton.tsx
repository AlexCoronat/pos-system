/**
 * BrandButton Component
 * Button that automatically uses company branding colors
 */

'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BrandButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
    loadingText?: string
}

const BrandButton = forwardRef<HTMLButtonElement, BrandButtonProps>(
    ({
        className,
        variant = 'primary',
        size = 'md',
        isLoading,
        loadingText,
        disabled,
        children,
        ...props
    }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

        const variants = {
            primary: 'text-white shadow-sm',
            secondary: 'text-white shadow-sm',
            outline: 'border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/10',
            ghost: 'text-brand-primary hover:bg-brand-primary/10',
            link: 'text-brand-primary underline-offset-4 hover:underline',
            destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
        }

        const sizes = {
            sm: 'h-8 px-3 text-sm gap-1.5',
            md: 'h-10 px-4 text-sm gap-2',
            lg: 'h-12 px-6 text-base gap-2'
        }

        // Inline styles for brand colors to ensure visibility
        const getInlineStyles = () => {
            if (variant === 'primary') {
                return { backgroundColor: 'var(--color-primary, #3B82F6)' }
            }
            if (variant === 'secondary') {
                return { backgroundColor: 'var(--color-secondary, #10B981)' }
            }
            return {}
        }

        return (
            <button
                ref={ref}
                className={cn(
                    baseStyles,
                    variants[variant],
                    sizes[size],
                    className
                )}
                style={getInlineStyles()}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading && loadingText ? loadingText : children}
            </button>
        )
    }
)

BrandButton.displayName = 'BrandButton'

export { BrandButton }
