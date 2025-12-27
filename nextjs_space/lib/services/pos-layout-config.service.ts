'use client'

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ==========================================
// TYPES
// ==========================================

export interface POSLayoutConfig {
    showSearchBar: boolean
    showCategoryFilter: boolean
    showQuickProducts: boolean
    showAllProducts: boolean
    showServices: boolean
    layoutSplit: '50-50' | '60-40' | '70-30'
}

export const DEFAULT_POS_LAYOUT_CONFIG: POSLayoutConfig = {
    showSearchBar: true,
    showCategoryFilter: true,
    showQuickProducts: true,
    showAllProducts: true,
    showServices: false,
    layoutSplit: '70-30'
}

// ==========================================
// POS LAYOUT CONFIG SERVICE
// ==========================================

class POSLayoutConfigService {
    /**
     * Get POS layout configuration for the current business
     */
    async getConfig(): Promise<POSLayoutConfig> {
        try {
            const businessId = await this.getCurrentBusinessId()

            const { data, error } = await supabase
                .from('businesses')
                .select('metadata')
                .eq('id', businessId)
                .single()

            if (error) throw error

            // Extract pos_layout from metadata or use defaults
            const posLayout = data?.metadata?.pos_layout as Partial<POSLayoutConfig> | undefined

            return {
                ...DEFAULT_POS_LAYOUT_CONFIG,
                ...posLayout
            }
        } catch (error) {
            console.error('Error fetching POS layout config:', error)
            return DEFAULT_POS_LAYOUT_CONFIG
        }
    }

    /**
     * Update POS layout configuration
     */
    async updateConfig(config: Partial<POSLayoutConfig>): Promise<void> {
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
                pos_layout: {
                    ...DEFAULT_POS_LAYOUT_CONFIG,
                    ...(current?.metadata?.pos_layout || {}),
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
            console.error('Error updating POS layout config:', error)
            throw error
        }
    }

    /**
     * Reset POS layout to defaults
     */
    async resetToDefaults(): Promise<void> {
        await this.updateConfig(DEFAULT_POS_LAYOUT_CONFIG)
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

export const posLayoutConfigService = new POSLayoutConfigService()
