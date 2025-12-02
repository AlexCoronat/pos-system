/**
 * Branding Context
 * Provides company branding (logo, colors, slogan) throughout the app
 */

'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { companyService } from '@/lib/services/company.service'

interface BrandingData {
    primaryColor: string
    secondaryColor: string
    slogan: string
    logoUrl?: string
}

interface BrandingContextType {
    branding: BrandingData
    isLoading: boolean
    refreshBranding: () => Promise<void>
}

const defaultBranding: BrandingData = {
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    slogan: '',
    logoUrl: undefined
}

const BrandingContext = createContext<BrandingContextType>({
    branding: defaultBranding,
    isLoading: true,
    refreshBranding: async () => { }
})

export function BrandingProvider({ children }: { children: ReactNode }) {
    const [branding, setBranding] = useState<BrandingData>(defaultBranding)
    const [isLoading, setIsLoading] = useState(true)

    const loadBranding = async () => {
        try {
            const companyInfo = await companyService.getCompanyInfo()

            const brandingData: BrandingData = {
                primaryColor: companyInfo.branding?.primaryColor || defaultBranding.primaryColor,
                secondaryColor: companyInfo.branding?.secondaryColor || defaultBranding.secondaryColor,
                slogan: companyInfo.branding?.slogan || defaultBranding.slogan,
                logoUrl: companyInfo.logoUrl || undefined
            }

            setBranding(brandingData)

            // Apply CSS variables to root
            applyCSSVariables(brandingData)
        } catch (error) {
            console.error('Error loading branding:', error)
            // Use default branding on error
            applyCSSVariables(defaultBranding)
        } finally {
            setIsLoading(false)
        }
    }

    const applyCSSVariables = (brandingData: BrandingData) => {
        const root = document.documentElement

        // Convert hex to RGB for use with opacity
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
            return result
                ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
                : '59, 130, 246' // default blue
        }

        // Set CSS variables
        root.style.setProperty('--color-primary', brandingData.primaryColor)
        root.style.setProperty('--color-primary-rgb', hexToRgb(brandingData.primaryColor))
        root.style.setProperty('--color-secondary', brandingData.secondaryColor)
        root.style.setProperty('--color-secondary-rgb', hexToRgb(brandingData.secondaryColor))
    }

    useEffect(() => {
        loadBranding()
    }, [])

    const refreshBranding = async () => {
        await loadBranding()
    }

    return (
        <BrandingContext.Provider value={{ branding, isLoading, refreshBranding }}>
            {children}
        </BrandingContext.Provider>
    )
}

export function useBranding() {
    const context = useContext(BrandingContext)
    if (!context) {
        throw new Error('useBranding must be used within a BrandingProvider')
    }
    return context
}
