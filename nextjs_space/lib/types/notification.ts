// Notification types and interfaces

export type NotificationType = 'stock_alert' | 'sales' | 'system' | 'info' | 'transfer'

export interface Notification {
    id: number
    business_id: number
    location_id?: number
    user_id?: string
    type: NotificationType
    title: string
    message: string
    data?: Record<string, any>
    read: boolean
    read_at?: string
    created_at: string
    expires_at?: string
}

export interface NotificationPreferences {
    id: number
    business_id: number
    desktop_notifications: boolean
    sound_enabled: boolean
    low_stock_alerts: boolean
    low_stock_threshold: number
    sales_notifications: boolean
    sales_amount_threshold: number
    daily_email_summary: boolean
    email_recipients: string[]
    created_at: string
    updated_at: string
}

export interface CreateNotificationData {
    business_id: number
    location_id?: number
    user_id?: string
    type: NotificationType
    title: string
    message: string
    data?: Record<string, any>
    expires_at?: string
}

export interface NotificationFilter {
    type?: NotificationType
    read?: boolean
    location_id?: number
    limit?: number
    offset?: number
}

export interface NotificationStats {
    total: number
    unread: number
    by_type: Record<NotificationType, number>
}
