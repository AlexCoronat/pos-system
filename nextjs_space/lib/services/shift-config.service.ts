'use client'

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ==========================================
// TYPES
// ==========================================

export interface ShiftConfig {
    shiftsEnabled: boolean         // Si se requiere abrir turno para usar el POS
    shiftDurationHours: number     // Duración del turno en horas
    autoCloseShift: boolean        // Cerrar turno automáticamente al cumplir duración
    requireOpeningAmount: boolean  // Requiere ingresar monto inicial al abrir turno
    requireClosingCount: boolean   // Requiere conteo de caja al cerrar turno
}

export const DEFAULT_SHIFT_CONFIG: ShiftConfig = {
    shiftsEnabled: true,
    shiftDurationHours: 8,
    autoCloseShift: false,
    requireOpeningAmount: true,
    requireClosingCount: true
}

// ==========================================
// SHIFT CONFIG SERVICE
// ==========================================

class ShiftConfigService {
    /**
     * Get shift configuration for the current business
     */
    async getConfig(): Promise<ShiftConfig> {
        try {
            const businessId = await this.getCurrentBusinessId()

            const { data, error } = await supabase
                .from('businesses')
                .select('metadata')
                .eq('id', businessId)
                .single()

            if (error) throw error

            // Extract shift_config from metadata or use defaults
            const shiftConfig = data?.metadata?.shift_config as Partial<ShiftConfig> | undefined

            return {
                ...DEFAULT_SHIFT_CONFIG,
                ...shiftConfig
            }
        } catch (error) {
            console.error('Error fetching shift config:', error)
            return DEFAULT_SHIFT_CONFIG
        }
    }

    /**
     * Update shift configuration
     */
    async updateConfig(config: Partial<ShiftConfig>): Promise<void> {
        try {
            const businessId = await this.getCurrentBusinessId()

            // First get current metadata
            const { data: current, error: fetchError } = await supabase
                .from('businesses')
                .select('metadata')
                .eq('id', businessId)
                .single()

            if (fetchError) throw fetchError

            // Merge new config with existing metadata
            const updatedMetadata = {
                ...(current?.metadata || {}),
                shift_config: {
                    ...DEFAULT_SHIFT_CONFIG,
                    ...(current?.metadata?.shift_config || {}),
                    ...config
                }
            }

            // Update metadata
            const { error: updateError } = await supabase
                .from('businesses')
                .update({
                    metadata: updatedMetadata,
                    updated_at: new Date().toISOString()
                })
                .eq('id', businessId)

            if (updateError) throw updateError
        } catch (error) {
            console.error('Error updating shift config:', error)
            throw error
        }
    }

    /**
     * Reset shift config to defaults
     */
    async resetToDefaults(): Promise<void> {
        await this.updateConfig(DEFAULT_SHIFT_CONFIG)
    }

    /**
     * Helper: Get current business ID from session
     */
    private async getCurrentBusinessId(): Promise<number> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data, error } = await supabase
            .from('user_details')
            .select('business_id')
            .eq('id', user.id)
            .single()

        if (error || !data?.business_id) {
            throw new Error('Business ID not found')
        }

        return data.business_id
    }
}

export const shiftConfigService = new ShiftConfigService()
