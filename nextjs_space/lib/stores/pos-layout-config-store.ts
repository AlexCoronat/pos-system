'use client'

import { create } from 'zustand'
import { POSLayoutConfig, DEFAULT_POS_LAYOUT_CONFIG, posLayoutConfigService } from '@/lib/services/pos-layout-config.service'

interface POSLayoutConfigStore {
    config: POSLayoutConfig
    isLoading: boolean
    isLoaded: boolean

    loadConfig: () => Promise<void>
    updateConfig: (updates: Partial<POSLayoutConfig>) => Promise<void>
    resetToDefaults: () => Promise<void>

    // Individual toggles for convenience
    toggleSearchBar: () => Promise<void>
    toggleCategoryFilter: () => Promise<void>
    toggleQuickProducts: () => Promise<void>
    toggleAllProducts: () => Promise<void>
    toggleServices: () => Promise<void>
    setLayoutSplit: (split: '50-50' | '60-40' | '70-30') => Promise<void>
}

export const usePOSLayoutConfigStore = create<POSLayoutConfigStore>((set, get) => ({
    config: DEFAULT_POS_LAYOUT_CONFIG,
    isLoading: false,
    isLoaded: false,

    loadConfig: async () => {
        if (get().isLoaded) return

        set({ isLoading: true })
        try {
            const config = await posLayoutConfigService.getConfig()
            set({ config, isLoaded: true })
        } catch (error) {
            console.error('Error loading POS layout config:', error)
        } finally {
            set({ isLoading: false })
        }
    },

    updateConfig: async (updates) => {
        const currentConfig = get().config
        const newConfig = { ...currentConfig, ...updates }

        // Optimistic update
        set({ config: newConfig })

        try {
            await posLayoutConfigService.updateConfig(updates)
        } catch (error) {
            // Rollback on error
            set({ config: currentConfig })
            throw error
        }
    },

    resetToDefaults: async () => {
        const currentConfig = get().config

        // Optimistic update
        set({ config: DEFAULT_POS_LAYOUT_CONFIG })

        try {
            await posLayoutConfigService.resetToDefaults()
        } catch (error) {
            // Rollback on error
            set({ config: currentConfig })
            throw error
        }
    },

    toggleSearchBar: async () => {
        const { config, updateConfig } = get()
        await updateConfig({ showSearchBar: !config.showSearchBar })
    },

    toggleCategoryFilter: async () => {
        const { config, updateConfig } = get()
        await updateConfig({ showCategoryFilter: !config.showCategoryFilter })
    },

    toggleQuickProducts: async () => {
        const { config, updateConfig } = get()
        await updateConfig({ showQuickProducts: !config.showQuickProducts })
    },

    toggleAllProducts: async () => {
        const { config, updateConfig } = get()
        await updateConfig({ showAllProducts: !config.showAllProducts })
    },

    toggleServices: async () => {
        const { config, updateConfig } = get()
        await updateConfig({ showServices: !config.showServices })
    },

    setLayoutSplit: async (split) => {
        await get().updateConfig({ layoutSplit: split })
    }
}))

// Hook to use just the config with auto-loading
export function usePOSLayoutConfig() {
    const { config, isLoading, isLoaded, loadConfig } = usePOSLayoutConfigStore()

    // Auto-load on first access
    if (!isLoaded && !isLoading) {
        loadConfig()
    }

    return { config, isLoading }
}
