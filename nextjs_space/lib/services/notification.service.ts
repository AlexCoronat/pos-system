import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ==========================================
// TYPES
// ==========================================

export interface NotificationChannels {
    email: boolean
    push: boolean
    inApp: boolean
}

export interface NotificationEvents {
    [eventType: string]: NotificationChannels
}

export interface NotificationSettings {
    id: string
    businessId: number
    userId: string | null
    channels: NotificationChannels
    events: NotificationEvents
}

export interface EmailTemplate {
    id: string
    businessId: number
    eventType: string
    subject: string
    body: string
    variables: string[]
    isActive: boolean
}

export interface UpdateNotificationSettingsData {
    channels?: NotificationChannels
    events?: NotificationEvents
}

export interface CreateEmailTemplateData {
    eventType: string
    subject: string
    body: string
    variables?: string[]
}

export interface UpdateEmailTemplateData {
    subject?: string
    body?: string
    variables?: string[]
    isActive?: boolean
}

// Common event types
export const EVENT_TYPES = {
    // Sales
    SALE_CREATED: 'sale.created',
    SALE_CANCELLED: 'sale.cancelled',
    SALE_REFUNDED: 'sale.refunded',

    // Inventory
    INVENTORY_LOW_STOCK: 'inventory.low_stock',
    INVENTORY_OUT_OF_STOCK: 'inventory.out_of_stock',
    INVENTORY_RESTOCKED: 'inventory.restocked',

    // Team
    TEAM_MEMBER_ADDED: 'team.member_added',
    TEAM_MEMBER_REMOVED: 'team.member_removed',
    TEAM_ROLE_CHANGED: 'team.role_changed',

    // Quotes
    QUOTE_CREATED: 'quote.created',
    QUOTE_ACCEPTED: 'quote.accepted',
    QUOTE_EXPIRED: 'quote.expired',

    // System
    SYSTEM_ERROR: 'system.error',
    SYSTEM_UPDATE: 'system.update',
    SYSTEM_BACKUP: 'system.backup'
} as const

// ==========================================
// NOTIFICATION SERVICE
// ==========================================

class NotificationService {
    /**
     * Get notification settings for current user
     * Falls back to business defaults if user has no custom settings
     */
    async getNotificationSettings(): Promise<NotificationSettings | null> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuario no autenticado')

        const { data, error } = await supabase
            .rpc('get_notification_preferences', { p_user_id: user.id })
            .single()

        if (error) {
            // If no settings exist, return defaults
            if (error.code === 'PGRST116') {
                return null
            }
            throw new Error('Error al obtener configuración: ' + error.message)
        }

        const businessId = await this.getCurrentBusinessId()
        const result = data as any

        return {
            id: result.id || '',
            businessId: businessId,
            userId: user.id,
            channels: result.channels || { email: true, push: true, inApp: true },
            events: result.events || {}
        }
    }

    /**
     * Get business-wide notification defaults
     */
    async getBusinessDefaults(): Promise<NotificationSettings | null> {
        const businessId = await this.getCurrentBusinessId()

        const { data, error } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('business_id', businessId)
            .is('user_id', null)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null
            throw new Error('Error al obtener configuración por defecto: ' + error.message)
        }

        return {
            id: data.id,
            businessId: data.business_id,
            userId: null,
            channels: data.channels,
            events: data.events
        }
    }

    /**
     * Update notification settings for current user
     */
    async updateNotificationSettings(updates: UpdateNotificationSettingsData): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuario no autenticado')

        const businessId = await this.getCurrentBusinessId()

        const { error } = await supabase
            .from('notification_settings')
            .upsert({
                business_id: businessId,
                user_id: user.id,
                channels: updates.channels,
                events: updates.events,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'business_id,user_id'
            })

        if (error) throw new Error('Error al actualizar configuración: ' + error.message)
    }

    /**
     * Update business-wide notification defaults (Admin only)
     */
    async updateBusinessDefaults(updates: UpdateNotificationSettingsData): Promise<void> {
        const businessId = await this.getCurrentBusinessId()

        const { error } = await supabase
            .from('notification_settings')
            .upsert({
                business_id: businessId,
                user_id: null,
                channels: updates.channels,
                events: updates.events,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'business_id,user_id'
            })

        if (error) throw new Error('Error al actualizar configuración por defecto: ' + error.message)
    }

    /**
     * Get all email templates
     */
    async getEmailTemplates(): Promise<EmailTemplate[]> {
        const businessId = await this.getCurrentBusinessId()

        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('business_id', businessId)
            .order('event_type')

        if (error) throw new Error('Error al obtener plantillas: ' + error.message)

        return (data || []).map(template => ({
            id: template.id,
            businessId: template.business_id,
            eventType: template.event_type,
            subject: template.subject,
            body: template.body,
            variables: template.variables || [],
            isActive: template.is_active
        }))
    }

    /**
     * Get email template by event type
     */
    async getEmailTemplate(eventType: string): Promise<EmailTemplate | null> {
        const businessId = await this.getCurrentBusinessId()

        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('business_id', businessId)
            .eq('event_type', eventType)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null
            throw new Error('Error al obtener plantilla: ' + error.message)
        }

        return {
            id: data.id,
            businessId: data.business_id,
            eventType: data.event_type,
            subject: data.subject,
            body: data.body,
            variables: data.variables || [],
            isActive: data.is_active
        }
    }

    /**
     * Create email template
     */
    async createEmailTemplate(template: CreateEmailTemplateData): Promise<string> {
        const businessId = await this.getCurrentBusinessId()

        const { data, error } = await supabase
            .from('email_templates')
            .insert({
                business_id: businessId,
                event_type: template.eventType,
                subject: template.subject,
                body: template.body,
                variables: template.variables || [],
                is_active: true
            })
            .select('id')
            .single()

        if (error) throw new Error('Error al crear plantilla: ' + error.message)

        return data.id
    }

    /**
     * Update email template
     */
    async updateEmailTemplate(id: string, updates: UpdateEmailTemplateData): Promise<void> {
        const updateData: any = {
            updated_at: new Date().toISOString()
        }

        if (updates.subject !== undefined) updateData.subject = updates.subject
        if (updates.body !== undefined) updateData.body = updates.body
        if (updates.variables !== undefined) updateData.variables = updates.variables
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive

        const { error } = await supabase
            .from('email_templates')
            .update(updateData)
            .eq('id', id)

        if (error) throw new Error('Error al actualizar plantilla: ' + error.message)
    }

    /**
     * Delete email template
     */
    async deleteEmailTemplate(id: string): Promise<void> {
        const { error } = await supabase
            .from('email_templates')
            .delete()
            .eq('id', id)

        if (error) throw new Error('Error al eliminar plantilla: ' + error.message)
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

export const notificationService = new NotificationService()
