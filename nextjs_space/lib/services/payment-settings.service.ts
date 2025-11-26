import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ==========================================
// TYPES
// ==========================================

export interface PaymentMethod {
    id: number
    code: string
    name: string
    type: string
    isActive: boolean
}

export interface BusinessPaymentSetting {
    id: number
    businessId: number
    paymentMethodId: number
    isEnabled: boolean
    config: PaymentMethodConfig
    displayOrder: number

    // Joined from payment_methods
    methodCode?: string
    methodName?: string
    methodType?: string
}

export interface PaymentMethodConfig {
    // Cash config
    denominations?: number[]
    openingBalance?: number
    requireCountOnClose?: boolean

    // Card config
    processor?: 'stripe' | 'clip' | 'square' | 'other'
    apiKeyEncrypted?: string
    feePercentage?: number
    feeFixed?: number
    installments?: number[]
    terminal?: {
        model?: string
        connection?: 'usb' | 'bluetooth' | 'ip'
        deviceId?: string
    }
    tips?: {
        enabled?: boolean
        suggestions?: number[]
    }
}

export interface EnablePaymentMethodData {
    paymentMethodId: number
    config: PaymentMethodConfig
    displayOrder?: number
}

export interface UpdatePaymentMethodData {
    isEnabled?: boolean
    config?: PaymentMethodConfig
    displayOrder?: number
}

// ==========================================
// PAYMENT SETTINGS SERVICE
// ==========================================

class PaymentSettingsService {
    /**
     * Get all available payment methods (global catalog)
     */
    async getAvailablePaymentMethods(): Promise<PaymentMethod[]> {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('is_active', true)
            .order('name')

        if (error) throw new Error('Error al obtener métodos de pago: ' + error.message)

        return (data || []).map(pm => ({
            id: pm.id,
            code: pm.code,
            name: pm.name,
            type: pm.type,
            isActive: pm.is_active
        }))
    }

    /**
     * Get business payment settings
     */
    async getBusinessPaymentSettings(): Promise<BusinessPaymentSetting[]> {
        const businessId = await this.getCurrentBusinessId()

        const { data, error } = await supabase
            .from('business_payment_settings')
            .select(`
        *,
        payment_method:payment_methods(code, name, type)
      `)
            .eq('business_id', businessId)
            .order('display_order')

        if (error) throw new Error('Error al obtener configuración de pagos: ' + error.message)

        return (data || []).map(item => ({
            id: item.id,
            businessId: item.business_id,
            paymentMethodId: item.payment_method_id,
            isEnabled: item.is_enabled,
            config: item.config || {},
            displayOrder: item.display_order,
            methodCode: item.payment_method?.code,
            methodName: item.payment_method?.name,
            methodType: item.payment_method?.type
        }))
    }

    /**
     * Get enabled payment methods for this business
     */
    async getEnabledPaymentMethods(): Promise<BusinessPaymentSetting[]> {
        const businessId = await this.getCurrentBusinessId()

        const { data, error } = await supabase
            .rpc('get_enabled_payment_methods', { p_business_id: businessId })

        if (error) throw new Error('Error al obtener métodos habilitados: ' + error.message)

        return (data || []).map((item: any) => ({
            id: item.method_id,
            businessId: businessId,
            paymentMethodId: item.method_id,
            isEnabled: true,
            config: item.config || {},
            displayOrder: item.display_order,
            methodCode: item.method_code,
            methodName: item.method_name,
            methodType: item.method_type
        }))
    }

    /**
     * Enable a payment method for the business
     */
    async enablePaymentMethod(data: EnablePaymentMethodData): Promise<void> {
        const businessId = await this.getCurrentBusinessId()

        const { error } = await supabase
            .from('business_payment_settings')
            .upsert({
                business_id: businessId,
                payment_method_id: data.paymentMethodId,
                is_enabled: true,
                config: data.config,
                display_order: data.displayOrder || 0
            }, {
                onConflict: 'business_id,payment_method_id'
            })

        if (error) throw new Error('Error al habilitar método de pago: ' + error.message)
    }

    /**
     * Update payment method settings
     */
    async updatePaymentMethod(
        paymentMethodId: number,
        data: UpdatePaymentMethodData
    ): Promise<void> {
        const businessId = await this.getCurrentBusinessId()

        const updateData: any = {
            updated_at: new Date().toISOString()
        }

        if (data.isEnabled !== undefined) updateData.is_enabled = data.isEnabled
        if (data.config !== undefined) updateData.config = data.config
        if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder

        const { error } = await supabase
            .from('business_payment_settings')
            .update(updateData)
            .eq('business_id', businessId)
            .eq('payment_method_id', paymentMethodId)

        if (error) throw new Error('Error al actualizar método de pago: ' + error.message)
    }

    /**
     * Disable a payment method
     */
    async disablePaymentMethod(paymentMethodId: number): Promise<void> {
        const businessId = await this.getCurrentBusinessId()

        const { error } = await supabase
            .from('business_payment_settings')
            .update({
                is_enabled: false,
                updated_at: new Date().toISOString()
            })
            .eq('business_id', businessId)
            .eq('payment_method_id', paymentMethodId)

        if (error) throw new Error('Error al deshabilitar método de pago: ' + error.message)
    }

    /**
     * Reorder payment methods
     */
    async reorderPaymentMethods(orderedIds: number[]): Promise<void> {
        const businessId = await this.getCurrentBusinessId()

        // Update display_order for each method
        const updates = orderedIds.map((paymentMethodId, index) =>
            supabase
                .from('business_payment_settings')
                .update({ display_order: index })
                .eq('business_id', businessId)
                .eq('payment_method_id', paymentMethodId)
        )

        await Promise.all(updates)
    }

    /**
     * Helper: Get current business ID
     */
    private async getCurrentBusinessId(): Promise<number> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuario no autenticado')

        const { data } = await supabase
            .from('user_details')
            .select('business_id')
            .eq('id', user.id)
            .single()

        if (!data?.business_id) throw new Error('Usuario sin negocio asignado')

        return data.business_id
    }
}

export const paymentSettingsService = new PaymentSettingsService()
