import { supabase } from '@/lib/supabase/client'

// ============================================================================
// Types
// ============================================================================

export interface WhatsAppNumber {
    id: number
    phoneNumber: string
    twilioPhoneSid?: string
    businessId?: number
    businessName?: string
    assignedAt?: string
    assignedBy?: string
    isActive: boolean
    isVerified: boolean
    friendlyName?: string
    notes?: string
    createdAt: string
    updatedAt: string
}

export interface QuoteUsageMonthly {
    id: number
    businessId: number
    businessName?: string
    yearMonth: string
    quotesUsed: number
    quotesLimit: number
    overageQuotes: number
    overageAmount: number
    overagePricePerQuote: number
    allowOverage: boolean
    createdAt: string
}

export interface CreateWhatsAppNumberData {
    phoneNumber: string
    twilioPhoneSid?: string
    friendlyName?: string
    notes?: string
}

export interface AssignNumberData {
    numberId: number
    businessId: number
}

// ============================================================================
// Service Class
// ============================================================================

class WhatsAppAdminService {
    /**
     * Get all WhatsApp numbers in the pool
     */
    async getNumbers(): Promise<WhatsAppNumber[]> {
        const { data, error } = await supabase
            .from('whatsapp_numbers')
            .select(`
                *,
                businesses:business_id (name)
            `)
            .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)

        return (data || []).map(this.mapNumberFromDb)
    }

    /**
     * Get available (unassigned) numbers
     */
    async getAvailableNumbers(): Promise<WhatsAppNumber[]> {
        const { data, error } = await supabase
            .from('whatsapp_numbers')
            .select('*')
            .is('business_id', null)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)

        return (data || []).map(this.mapNumberFromDb)
    }

    /**
     * Add a new WhatsApp number to the pool
     */
    async addNumber(data: CreateWhatsAppNumberData): Promise<WhatsAppNumber> {
        const { data: result, error } = await supabase
            .from('whatsapp_numbers')
            .insert({
                phone_number: data.phoneNumber,
                twilio_phone_sid: data.twilioPhoneSid,
                friendly_name: data.friendlyName,
                notes: data.notes,
                is_active: true,
                is_verified: true
            })
            .select()
            .single()

        if (error) throw new Error(error.message)

        return this.mapNumberFromDb(result)
    }

    /**
     * Assign a number to a business
     */
    async assignNumber(numberId: number, businessId: number): Promise<WhatsAppNumber> {
        const { data, error } = await supabase
            .from('whatsapp_numbers')
            .update({
                business_id: businessId,
                assigned_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', numberId)
            .select(`
                *,
                businesses:business_id (name)
            `)
            .single()

        if (error) throw new Error(error.message)

        return this.mapNumberFromDb(data)
    }

    /**
     * Unassign a number from a business
     */
    async unassignNumber(numberId: number): Promise<WhatsAppNumber> {
        const { data, error } = await supabase
            .from('whatsapp_numbers')
            .update({
                business_id: null,
                assigned_at: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', numberId)
            .select()
            .single()

        if (error) throw new Error(error.message)

        return this.mapNumberFromDb(data)
    }

    /**
     * Delete a number from the pool
     */
    async deleteNumber(numberId: number): Promise<void> {
        const { error } = await supabase
            .from('whatsapp_numbers')
            .delete()
            .eq('id', numberId)

        if (error) throw new Error(error.message)
    }

    /**
     * Get all businesses (for assignment dropdown)
     */
    async getBusinesses(): Promise<{ id: number; name: string }[]> {
        const { data, error } = await supabase
            .from('businesses')
            .select('id, name')
            .order('name')

        if (error) throw new Error(error.message)

        return data || []
    }

    /**
     * Get monthly usage for all businesses
     */
    async getMonthlyUsage(yearMonth?: string): Promise<QuoteUsageMonthly[]> {
        const targetMonth = yearMonth || new Date().toISOString().slice(0, 7)

        const { data, error } = await supabase
            .from('quote_usage_monthly')
            .select(`
                *,
                businesses:business_id (name)
            `)
            .eq('year_month', targetMonth)
            .order('quotes_used', { ascending: false })

        if (error) throw new Error(error.message)

        return (data || []).map(this.mapUsageFromDb)
    }

    // ========================================================================
    // Private Helpers
    // ========================================================================

    private mapNumberFromDb(data: any): WhatsAppNumber {
        return {
            id: data.id,
            phoneNumber: data.phone_number,
            twilioPhoneSid: data.twilio_phone_sid,
            businessId: data.business_id,
            businessName: data.businesses?.name,
            assignedAt: data.assigned_at,
            assignedBy: data.assigned_by,
            isActive: data.is_active,
            isVerified: data.is_verified,
            friendlyName: data.friendly_name,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        }
    }

    private mapUsageFromDb(data: any): QuoteUsageMonthly {
        return {
            id: data.id,
            businessId: data.business_id,
            businessName: data.businesses?.name,
            yearMonth: data.year_month,
            quotesUsed: data.quotes_used,
            quotesLimit: data.quotes_limit,
            overageQuotes: data.overage_quotes,
            overageAmount: parseFloat(data.overage_amount),
            overagePricePerQuote: parseFloat(data.overage_price_per_quote),
            allowOverage: data.allow_overage,
            createdAt: data.created_at
        }
    }
}

export const whatsappAdminService = new WhatsAppAdminService()
