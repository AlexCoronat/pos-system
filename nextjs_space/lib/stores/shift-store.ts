/**
 * Shift Store
 * Global state management for shifts
 */

import { create } from 'zustand'
import { shiftService, type Shift, type OpenShiftData, type CloseShiftData } from '@/lib/services/shift.service'

interface ShiftStore {
    currentShift: Shift | null
    isLoading: boolean
    error: string | null

    // Actions
    loadCurrentShift: () => Promise<void>
    openShift: (data: OpenShiftData) => Promise<void>
    closeShift: (data: CloseShiftData) => Promise<void>
    clearShift: () => void
    setError: (error: string | null) => void
}

export const useShiftStore = create<ShiftStore>((set, get) => ({
    currentShift: null,
    isLoading: false,
    error: null,

    loadCurrentShift: async () => {
        set({ isLoading: true, error: null })
        try {
            const shift = await shiftService.getCurrentShift()
            set({ currentShift: shift, isLoading: false })
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Error al cargar turno',
                isLoading: false
            })
        }
    },

    openShift: async (data: OpenShiftData) => {
        set({ isLoading: true, error: null })
        try {
            const shift = await shiftService.openShift(data)
            set({ currentShift: shift, isLoading: false })
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Error al abrir turno'
            set({ error: errorMsg, isLoading: false })
            throw new Error(errorMsg)
        }
    },

    closeShift: async (data: CloseShiftData) => {
        const { currentShift } = get()
        if (!currentShift) {
            throw new Error('No hay turno abierto')
        }

        set({ isLoading: true, error: null })
        try {
            await shiftService.closeShift(currentShift.id, data)
            set({ currentShift: null, isLoading: false })
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Error al cerrar turno'
            set({ error: errorMsg, isLoading: false })
            throw new Error(errorMsg)
        }
    },

    clearShift: () => {
        set({ currentShift: null, error: null })
    },

    setError: (error: string | null) => {
        set({ error })
    }
}))
