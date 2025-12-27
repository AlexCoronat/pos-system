import { supabase } from '@/lib/supabase/client'
import { getBusinessContext } from '@/lib/utils/business-context'

// ============================================================================
// Types
// ============================================================================

export type AIProvider = 'claude' | 'openai' | 'deepseek'
export type ConversationChannel = 'whatsapp' | 'email' | 'web' | 'telegram'
export type SessionStatus = 'active' | 'completed' | 'expired' | 'cancelled'

export interface QuoteAutomationSettings {
    id: number
    businessId: number

    // AI Configuration
    aiProvider: AIProvider
    aiModel: string
    aiTemperature: number

    // Feature toggles
    isEnabled: boolean
    whatsappEnabled: boolean
    emailEnabled: boolean
    webEnabled: boolean

    // Rate limiting
    dailyQuoteLimit: number

    // Behavior
    autoSendQuote: boolean
    includeProductImages: boolean
    defaultExpiryDays: number

    // Customization
    systemPrompt?: string
    greetingMessage: string

    // Twilio WhatsApp Configuration
    twilioAccountSid?: string
    twilioAuthToken?: string  // Only for display (masked)
    twilioWhatsappNumber?: string
    twilioVerified: boolean
    twilioVerifiedAt?: string
    twilioWebhookUrl?: string

    createdAt: string
    updatedAt: string
}

export interface ConversationSession {
    id: string
    businessId: number
    customerId?: number
    customerPhone?: string
    customerEmail?: string
    customerName?: string
    channel: ConversationChannel
    channelSessionId?: string
    messages: ConversationMessage[]
    extractedItems: ExtractedItem[]
    status: SessionStatus
    quoteId?: number
    createdAt: string
    updatedAt: string
    expiresAt: string
}

export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
    metadata?: Record<string, any>
}

export interface ExtractedItem {
    productId?: number
    productName: string
    quantity: number
    unitPrice?: number
    matched: boolean
}

export interface LimitCheckResult {
    allowed: boolean
    currentCount: number
    dailyLimit: number
    remaining: number
}

export interface UpdateSettingsData {
    aiProvider?: AIProvider
    aiModel?: string
    aiTemperature?: number
    isEnabled?: boolean
    whatsappEnabled?: boolean
    emailEnabled?: boolean
    webEnabled?: boolean
    dailyQuoteLimit?: number
    autoSendQuote?: boolean
    includeProductImages?: boolean
    defaultExpiryDays?: number
    systemPrompt?: string
    greetingMessage?: string
    // Twilio fields
    twilioAccountSid?: string
    twilioAuthToken?: string
    twilioWhatsappNumber?: string
}

export interface SendMessageRequest {
    customerPhone?: string
    customerEmail?: string
    customerName?: string
    message: string
    channel: ConversationChannel
    sessionId?: string
}

export interface SendMessageResponse {
    sessionId: string
    response: string
    quoteId?: number
    quoteNumber?: string
    completed: boolean
    extractedItems: ExtractedItem[]
}

// ============================================================================
// Service Class
// ============================================================================

class QuoteAutomationService {
    /**
     * Get automation settings for current business
     */
    async getSettings(): Promise<QuoteAutomationSettings | null> {
        try {
            const { businessId } = await getBusinessContext()

            const { data, error } = await supabase
                .from('quote_automation_settings')
                .select('*')
                .eq('business_id', businessId)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    // No settings exist, return defaults
                    return this.getDefaultSettings(businessId)
                }
                throw error
            }

            return this.mapSettingsFromDb(data)
        } catch (error: any) {
            console.error('Error getting automation settings:', error)
            throw new Error(error.message || 'Error al obtener configuración')
        }
    }

    /**
     * Update automation settings
     */
    async updateSettings(updates: UpdateSettingsData): Promise<QuoteAutomationSettings> {
        try {
            const { businessId } = await getBusinessContext()

            const dbData: any = {
                business_id: businessId,
                updated_at: new Date().toISOString()
            }

            if (updates.aiProvider !== undefined) dbData.ai_provider = updates.aiProvider
            if (updates.aiModel !== undefined) dbData.ai_model = updates.aiModel
            if (updates.aiTemperature !== undefined) dbData.ai_temperature = updates.aiTemperature
            if (updates.isEnabled !== undefined) dbData.is_enabled = updates.isEnabled
            if (updates.whatsappEnabled !== undefined) dbData.whatsapp_enabled = updates.whatsappEnabled
            if (updates.emailEnabled !== undefined) dbData.email_enabled = updates.emailEnabled
            if (updates.webEnabled !== undefined) dbData.web_enabled = updates.webEnabled
            if (updates.dailyQuoteLimit !== undefined) dbData.daily_quote_limit = updates.dailyQuoteLimit
            if (updates.autoSendQuote !== undefined) dbData.auto_send_quote = updates.autoSendQuote
            if (updates.includeProductImages !== undefined) dbData.include_product_images = updates.includeProductImages
            if (updates.defaultExpiryDays !== undefined) dbData.default_expiry_days = updates.defaultExpiryDays
            if (updates.systemPrompt !== undefined) dbData.system_prompt = updates.systemPrompt
            if (updates.greetingMessage !== undefined) dbData.greeting_message = updates.greetingMessage
            // Twilio fields
            if (updates.twilioAccountSid !== undefined) dbData.twilio_account_sid = updates.twilioAccountSid
            if (updates.twilioAuthToken !== undefined) {
                // Encode token to base64 for storage (in production, use proper encryption)
                dbData.twilio_auth_token_encrypted = btoa(updates.twilioAuthToken)
            }
            if (updates.twilioWhatsappNumber !== undefined) dbData.twilio_whatsapp_number = updates.twilioWhatsappNumber

            const { data, error } = await supabase
                .from('quote_automation_settings')
                .upsert(dbData, { onConflict: 'business_id' })
                .select()
                .single()

            if (error) throw error

            return this.mapSettingsFromDb(data)
        } catch (error: any) {
            console.error('Error updating automation settings:', error)
            throw new Error(error.message || 'Error al actualizar configuración')
        }
    }

    /**
     * Send a message to the AI assistant (calls Edge Function)
     */
    async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
        try {
            const { businessId } = await getBusinessContext()

            // Call the Edge Function
            const { data, error } = await supabase.functions.invoke('quote-ai-assistant', {
                body: {
                    businessId,
                    ...request
                }
            })

            if (error) throw error

            return data as SendMessageResponse
        } catch (error: any) {
            console.error('Error sending message to AI:', error)
            throw new Error(error.message || 'Error al enviar mensaje')
        }
    }

    /**
     * Check if customer has reached daily quote limit
     */
    async checkLimit(customerPhone?: string, customerEmail?: string): Promise<LimitCheckResult> {
        try {
            const { businessId } = await getBusinessContext()

            const { data, error } = await supabase
                .rpc('check_quote_automation_limit', {
                    p_business_id: businessId,
                    p_customer_phone: customerPhone || null,
                    p_customer_email: customerEmail || null
                })

            if (error) throw error

            return {
                allowed: data.allowed,
                currentCount: data.current_count,
                dailyLimit: data.daily_limit,
                remaining: data.remaining
            }
        } catch (error: any) {
            console.error('Error checking limit:', error)
            // On error, allow (fail open for better UX)
            return {
                allowed: true,
                currentCount: 0,
                dailyLimit: 3,
                remaining: 3
            }
        }
    }

    /**
     * Get conversation sessions for current business
     */
    async getSessions(
        filters: {
            status?: SessionStatus
            channel?: ConversationChannel
            dateFrom?: string
            dateTo?: string
        } = {},
        page: number = 1,
        pageSize: number = 20
    ): Promise<{
        sessions: ConversationSession[]
        total: number
        page: number
        pageSize: number
        totalPages: number
    }> {
        try {
            const { businessId } = await getBusinessContext()

            let query = supabase
                .from('quote_conversation_sessions')
                .select('*', { count: 'exact' })
                .eq('business_id', businessId)

            if (filters.status) {
                query = query.eq('status', filters.status)
            }
            if (filters.channel) {
                query = query.eq('channel', filters.channel)
            }
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom)
            }
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo)
            }

            const from = (page - 1) * pageSize
            const to = from + pageSize - 1
            query = query.range(from, to).order('created_at', { ascending: false })

            const { data, error, count } = await query

            if (error) throw error

            const sessions = (data || []).map(this.mapSessionFromDb)

            return {
                sessions,
                total: count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((count || 0) / pageSize)
            }
        } catch (error: any) {
            console.error('Error getting sessions:', error)
            throw new Error(error.message || 'Error al obtener sesiones')
        }
    }

    /**
     * Get a single session by ID
     */
    async getSessionById(sessionId: string): Promise<ConversationSession | null> {
        try {
            const { data, error } = await supabase
                .from('quote_conversation_sessions')
                .select('*')
                .eq('id', sessionId)
                .single()

            if (error) {
                if (error.code === 'PGRST116') return null
                throw error
            }

            return this.mapSessionFromDb(data)
        } catch (error: any) {
            console.error('Error getting session:', error)
            throw new Error(error.message || 'Error al obtener sesión')
        }
    }

    /**
     * Cancel a session
     */
    async cancelSession(sessionId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('quote_conversation_sessions')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', sessionId)

            if (error) throw error
        } catch (error: any) {
            console.error('Error cancelling session:', error)
            throw new Error(error.message || 'Error al cancelar sesión')
        }
    }

    // ========================================================================
    // Private Helpers
    // ========================================================================

    private getDefaultSettings(businessId: number): QuoteAutomationSettings {
        return {
            id: 0,
            businessId,
            aiProvider: 'claude',
            aiModel: 'claude-3-sonnet-20240229',
            aiTemperature: 0.7,
            isEnabled: false,
            whatsappEnabled: false,
            emailEnabled: false,
            webEnabled: false,
            dailyQuoteLimit: 3,
            autoSendQuote: true,
            includeProductImages: false,
            defaultExpiryDays: 7,
            greetingMessage: 'Hola! Soy tu asistente de cotizaciones. Cuéntame qué productos necesitas y te prepararé una cotización.',
            twilioVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    }

    private mapSettingsFromDb(data: any): QuoteAutomationSettings {
        return {
            id: data.id,
            businessId: data.business_id,
            aiProvider: data.ai_provider,
            aiModel: data.ai_model,
            aiTemperature: parseFloat(data.ai_temperature),
            isEnabled: data.is_enabled,
            whatsappEnabled: data.whatsapp_enabled,
            emailEnabled: data.email_enabled,
            webEnabled: data.web_enabled,
            dailyQuoteLimit: data.daily_quote_limit,
            autoSendQuote: data.auto_send_quote,
            includeProductImages: data.include_product_images,
            defaultExpiryDays: data.default_expiry_days,
            systemPrompt: data.system_prompt,
            greetingMessage: data.greeting_message,
            twilioAccountSid: data.twilio_account_sid,
            twilioWhatsappNumber: data.twilio_whatsapp_number,
            twilioVerified: data.twilio_verified || false,
            twilioVerifiedAt: data.twilio_verified_at,
            twilioWebhookUrl: data.twilio_webhook_url,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        }
    }

    private mapSessionFromDb(data: any): ConversationSession {
        return {
            id: data.id,
            businessId: data.business_id,
            customerId: data.customer_id,
            customerPhone: data.customer_phone,
            customerEmail: data.customer_email,
            customerName: data.customer_name,
            channel: data.channel,
            channelSessionId: data.channel_session_id,
            messages: data.messages || [],
            extractedItems: data.extracted_items || [],
            status: data.status,
            quoteId: data.quote_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            expiresAt: data.expires_at
        }
    }

    /**
     * Get WhatsApp info for current business from new tables
     * Returns: assigned number, plan info, monthly usage
     */
    async getWhatsAppInfo(): Promise<{
        assignedNumber: string | null
        isVerified: boolean
        planName: string
        whatsappEnabled: boolean
        monthlyQuoteLimit: number
        quotesUsed: number
        allowOverage: boolean
    }> {
        try {
            const { businessId } = await getBusinessContext()

            // Get business with plan info
            const { data: business, error: bizError } = await supabase
                .from('businesses')
                .select(`
                    subscription_plan_id,
                    subscription_plans:subscription_plan_id (
                        name,
                        whatsapp_enabled,
                        monthly_quote_limit
                    )
                `)
                .eq('id', businessId)
                .single()

            if (bizError) throw bizError

            // Get assigned WhatsApp number
            const { data: number } = await supabase
                .from('whatsapp_numbers')
                .select('phone_number, is_verified')
                .eq('business_id', businessId)
                .eq('is_active', true)
                .single()

            // Get monthly usage
            const yearMonth = new Date().toISOString().slice(0, 7)
            const { data: usage } = await supabase
                .from('quote_usage_monthly')
                .select('quotes_used, allow_overage')
                .eq('business_id', businessId)
                .eq('year_month', yearMonth)
                .single()

            const plan = business?.subscription_plans as any

            return {
                assignedNumber: number?.phone_number || null,
                isVerified: number?.is_verified || false,
                planName: plan?.name || 'free',
                whatsappEnabled: plan?.whatsapp_enabled || false,
                monthlyQuoteLimit: plan?.monthly_quote_limit || 0,
                quotesUsed: usage?.quotes_used || 0,
                allowOverage: usage?.allow_overage || false
            }
        } catch (error: any) {
            console.error('Error getting WhatsApp info:', error)
            return {
                assignedNumber: null,
                isVerified: false,
                planName: 'free',
                whatsappEnabled: false,
                monthlyQuoteLimit: 0,
                quotesUsed: 0,
                allowOverage: false
            }
        }
    }
}

export const quoteAutomationService = new QuoteAutomationService()

