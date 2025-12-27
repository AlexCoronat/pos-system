'use client'

import { create } from 'zustand'
import { ShiftConfig, DEFAULT_SHIFT_CONFIG, shiftConfigService } from '@/lib/services/shift-config.service'

interface ShiftConfigStore {
    config: ShiftConfig
    isLoading: boolean
    isLoaded: boolean

    loadConfig: () => Promise<void>
    updateConfig: (updates: Partial<ShiftConfig>) => Promise<void>
    resetToDefaults: () => Promise<void>

    // Individual toggles for convenience
    toggleShiftsEnabled: () => Promise<void>
    toggleAutoCloseShift: () => Promise<void>
    toggleRequireOpeningAmount: () => Promise<void>
    toggleRequireClosingCount: () => Promise<void>
    setShiftDuration: (hours: number) => Promise<void>
}

export const useShiftConfigStore = create<ShiftConfigStore>((set, get) => ({
    config: DEFAULT_SHIFT_CONFIG,
    isLoading: false,
    isLoaded: false,

    loadConfig: async () => {
        if (get().isLoaded) return

        set({ isLoading: true })
        try {
            const config = await shiftConfigService.getConfig()
            set({ config, isLoaded: true })
        } catch (error) {
            console.error('Error loading shift config:', error)
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
            await shiftConfigService.updateConfig(updates)
        } catch (error) {
            // Rollback on error
            set({ config: currentConfig })
            throw error
        }
    },

    resetToDefaults: async () => {
        const currentConfig = get().config

        // Optimistic update
        set({ config: DEFAULT_SHIFT_CONFIG })

        try {
            await shiftConfigService.resetToDefaults()
        } catch (error) {
            // Rollback on error
            set({ config: currentConfig })
            throw error
        }
    },

    toggleShiftsEnabled: async () => {
        const { config, updateConfig } = get()
        await updateConfig({ shiftsEnabled: !config.shiftsEnabled })
    },

    toggleAutoCloseShift: async () => {
        const { config, updateConfig } = get()
        await updateConfig({ autoCloseShift: !config.autoCloseShift })
    },

    toggleRequireOpeningAmount: async () => {
        const { config, updateConfig } = get()
        await updateConfig({ requireOpeningAmount: !config.requireOpeningAmount })
    },

    toggleRequireClosingCount: async () => {
        const { config, updateConfig } = get()
        await updateConfig({ requireClosingCount: !config.requireClosingCount })
    },

    setShiftDuration: async (hours: number) => {
        await get().updateConfig({ shiftDurationHours: hours })
    }
}))

// Hook to use just the config with auto-loading
export function useShiftConfig() {
    const { config, isLoading, isLoaded, loadConfig } = useShiftConfigStore()

    // Auto-load on first access
    if (!isLoaded && !isLoading) {
        loadConfig()
    }

    return { config, isLoading }
}
