import { createClient } from '@/lib/supabase/client'
import type {
    Notification,
    NotificationPreferences,
    CreateNotificationData,
    NotificationFilter,
    NotificationStats
} from '@/lib/types/notification'

/**
 * Alert Service - Manages in-app notifications and alerts
 * Separate from notification.service.ts which handles email templates
 */
export class AlertService {
    private supabase = createClient()

    /**
     * Get current user's business ID
     */
    private async getUserBusinessId(): Promise<number> {
        const { data: { user } } = await this.supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data, error } = await this.supabase
            .from('user_details')
            .select('business_id')
            .eq('id', user.id)
            .single()

        if (error) throw error
        if (!data?.business_id) throw new Error('User has no business')

        return data.business_id
    }

    /**
     * Create a new notification
     */
    async createNotification(notificationData: CreateNotificationData): Promise<Notification> {
        const { data, error } = await this.supabase
            .from('notifications')
            .insert(notificationData)
            .select()
            .single()

        if (error) throw error
        return data
    }

    /**
     * Get notifications for current user
     */
    async getNotifications(filter: NotificationFilter = {}): Promise<Notification[]> {
        const businessId = await this.getUserBusinessId()

        let query = this.supabase
            .from('notifications')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })

        // Apply filters
        if (filter.type) {
            query = query.eq('type', filter.type)
        }

        if (filter.read !== undefined) {
            query = query.eq('read', filter.read)
        }

        if (filter.location_id) {
            query = query.or(`location_id.eq.${filter.location_id},location_id.is.null`)
        }

        // Pagination
        if (filter.limit) {
            query = query.limit(filter.limit)
        }

        if (filter.offset) {
            query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    }

    /**
     * Get unread notifications count
     */
    async getUnreadCount(): Promise<number> {
        const businessId = await this.getUserBusinessId()

        const { count, error } = await this.supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .eq('read', false)

        if (error) throw error
        return count || 0
    }

    /**
     * Get notification statistics
     */
    async getStats(): Promise<NotificationStats> {
        const businessId = await this.getUserBusinessId()

        const { data, error } = await this.supabase
            .from('notifications')
            .select('type, read')
            .eq('business_id', businessId)

        if (error) throw error

        const stats: NotificationStats = {
            total: data?.length || 0,
            unread: data?.filter((n: any) => !n.read).length || 0,
            by_type: {
                stock_alert: 0,
                sales: 0,
                system: 0,
                info: 0
            }
        }

        data?.forEach((notification: any) => {
            stats.by_type[notification.type as keyof typeof stats.by_type]++
        })

        return stats
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: number): Promise<void> {
        const { error } = await this.supabase
            .from('notifications')
            .update({
                read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId)

        if (error) throw error
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<void> {
        const businessId = await this.getUserBusinessId()
        const { data: { user } } = await this.supabase.auth.getUser()

        if (!user) throw new Error('Not authenticated')

        const { error } = await this.supabase
            .from('notifications')
            .update({
                read: true,
                read_at: new Date().toISOString()
            })
            .eq('business_id', businessId)
            .eq('read', false)
            .or(`user_id.eq.${user.id},user_id.is.null`)

        if (error) throw error
    }

    /**
     * Delete a notification
     */
    async deleteNotification(notificationId: number): Promise<void> {
        const { error } = await this.supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)

        if (error) throw error
    }

    /**
     * Delete all read notifications
     */
    async deleteAllRead(): Promise<number> {
        const businessId = await this.getUserBusinessId()

        const { data, error } = await this.supabase
            .from('notifications')
            .delete()
            .eq('business_id', businessId)
            .eq('read', true)
            .select()

        if (error) throw error
        return data?.length || 0
    }

    // ============================================================================
    // NOTIFICATION PREFERENCES
    // ============================================================================

    /**
     * Get notification preferences for business
     */
    async getPreferences(): Promise<NotificationPreferences | null> {
        const businessId = await this.getUserBusinessId()

        const { data, error } = await this.supabase
            .from('notification_preferences')
            .select('*')
            .eq('business_id', businessId)
            .single()

        if (error && error.code !== 'PGRST116') throw error
        return data
    }

    /**
     * Update notification preferences (admin only)
     */
    async updatePreferences(
        preferences: Partial<Omit<NotificationPreferences, 'id' | 'business_id' | 'created_at' | 'updated_at'>>
    ): Promise<NotificationPreferences> {
        const businessId = await this.getUserBusinessId()

        // Upsert preferences
        const { data, error } = await this.supabase
            .from('notification_preferences')
            .upsert({
                business_id: businessId,
                ...preferences
            }, {
                onConflict: 'business_id'
            })
            .select()
            .single()

        if (error) throw error
        return data
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Create stock alert notification
     */
    async createStockAlert(params: {
        product_id: number
        product_name: string
        current_stock: number
        reorder_point: number
        location_id: number
    }): Promise<Notification | null> {
        const businessId = await this.getUserBusinessId()
        const preferences = await this.getPreferences()

        // Only create if low stock alerts are enabled
        if (!preferences?.low_stock_alerts) return null

        return this.createNotification({
            business_id: businessId,
            location_id: params.location_id,
            type: 'stock_alert',
            title: `Stock Bajo: ${params.product_name}`,
            message: `El producto está por debajo del punto de reorden. Stock actual: ${params.current_stock}, Punto de reorden: ${params.reorder_point}`,
            data: {
                product_id: params.product_id,
                product_name: params.product_name,
                current_stock: params.current_stock,
                reorder_point: params.reorder_point
            },
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
    }

    /**
     * Create sales notification
     */
    async createSalesNotification(params: {
        sale_id: number
        sale_number: string
        amount: number
        location_id: number
    }): Promise<Notification | null> {
        const businessId = await this.getUserBusinessId()
        const preferences = await this.getPreferences()

        // Only create if sales notifications are enabled and amount exceeds threshold
        if (!preferences?.sales_notifications) return null
        if (params.amount < (preferences.sales_amount_threshold || 0)) return null

        return this.createNotification({
            business_id: businessId,
            location_id: params.location_id,
            type: 'sales',
            title: `Venta Grande: ${params.sale_number}`,
            message: `Nueva venta de $${params.amount.toFixed(2)} completada`,
            data: {
                sale_id: params.sale_id,
                sale_number: params.sale_number,
                amount: params.amount
            },
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
    }

    /**
     * Create system notification (business-wide)
     */
    async createSystemNotification(params: {
        title: string
        message: string
        data?: Record<string, any>
    }): Promise<Notification> {
        const businessId = await this.getUserBusinessId()

        return this.createNotification({
            business_id: businessId,
            type: 'system',
            title: params.title,
            message: params.message,
            data: params.data
        })
    }
}

export const alertService = new AlertService()
