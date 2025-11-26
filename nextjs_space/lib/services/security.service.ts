import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ==========================================
// TYPES
// ==========================================

export interface PasswordPolicy {
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSymbols: boolean
    expirationDays: number | null
    historyCount: number
    maxAttempts: number
    lockoutMinutes: number
}

export interface TwoFactorConfig {
    required: 'none' | 'admins' | 'all'
    methods: ('app' | 'sms' | 'email')[]
}

export interface SessionConfig {
    durationHours: number
    inactivityMinutes: number
    maxConcurrent: number
}

export interface SecuritySettings {
    businessId: number
    passwordPolicy: PasswordPolicy
    twoFactorConfig: TwoFactorConfig
    sessionConfig: SessionConfig
    auditRetentionDays: number
}

export interface AuditLogEntry {
    id: string
    tableName: string
    recordId: string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    oldData?: any
    newData?: any
    changedFields?: string[]
    userId?: string
    userIp?: string
    sessionId?: string
    metadata?: any
    createdAt: Date
}

export interface AuditLogFilters {
    userId?: string
    tableName?: string
    action?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
}

export interface ActiveSession {
    id: string
    userId: string
    userEmail?: string
    userName?: string
    ipAddress?: string
    userAgent?: string
    lastActivity: Date
    createdAt: Date
}

// ==========================================
// SECURITY SERVICE
// ==========================================

class SecurityService {
    /**
     * Get security settings for current business
     */
    async getSecuritySettings(): Promise<SecuritySettings | null> {
        const businessId = await this.getCurrentBusinessId()

        const { data, error } = await supabase
            .from('security_settings')
            .select('*')
            .eq('business_id', businessId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null // Not found, will use defaults
            throw new Error('Error al obtener configuración de seguridad: ' + error.message)
        }

        return {
            businessId: data.business_id,
            passwordPolicy: data.password_policy,
            twoFactorConfig: data.two_factor_config,
            sessionConfig: data.session_config,
            auditRetentionDays: data.audit_retention_days
        }
    }

    /**
     * Update password policy
     */
    async updatePasswordPolicy(policy: Partial<PasswordPolicy>): Promise<void> {
        const businessId = await this.getCurrentBusinessId()

        // Get current settings
        const current = await this.getSecuritySettings()
        const currentPolicy = current?.passwordPolicy || this.getDefaultPasswordPolicy()

        // Merge with updates
        const updatedPolicy = { ...currentPolicy, ...policy }

        const { error } = await supabase
            .from('security_settings')
            .upsert({
                business_id: businessId,
                password_policy: updatedPolicy,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'business_id'
            })

        if (error) throw new Error('Error al actualizar política de contraseñas: ' + error.message)
    }

    /**
     * Update 2FA configuration
     */
    async updateTwoFactorConfig(config: Partial<TwoFactorConfig>): Promise<void> {
        const businessId = await this.getCurrentBusinessId()

        const current = await this.getSecuritySettings()
        const currentConfig = current?.twoFactorConfig || { required: 'none', methods: ['app'] }

        const updatedConfig = { ...currentConfig, ...config }

        const { error } = await supabase
            .from('security_settings')
            .upsert({
                business_id: businessId,
                two_factor_config: updatedConfig,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'business_id'
            })

        if (error) throw new Error('Error al actualizar configuración 2FA: ' + error.message)
    }

    /**
     * Update session configuration
     */
    async updateSessionConfig(config: Partial<SessionConfig>): Promise<void> {
        const businessId = await this.getCurrentBusinessId()

        const current = await this.getSecuritySettings()
        const currentConfig = current?.sessionConfig || {
            durationHours: 8,
            inactivityMinutes: 30,
            maxConcurrent: 3
        }

        const updatedConfig = { ...currentConfig, ...config }

        const { error } = await supabase
            .from('security_settings')
            .upsert({
                business_id: businessId,
                session_config: updatedConfig,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'business_id'
            })

        if (error) throw new Error('Error al actualizar configuración de sesiones: ' + error.message)
    }

    /**
     * Update audit retention period
     */
    async updateAuditRetention(days: number): Promise<void> {
        const businessId = await this.getCurrentBusinessId()

        const { error } = await supabase
            .from('security_settings')
            .upsert({
                business_id: businessId,
                audit_retention_days: days,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'business_id'
            })

        if (error) throw new Error('Error al actualizar retención de logs: ' + error.message)
    }

    /**
     * Get audit logs with filters
     */
    async getAuditLogs(filters: AuditLogFilters = {}): Promise<{
        logs: AuditLogEntry[]
        total: number
    }> {
        const limit = filters.limit || 50
        const offset = filters.offset || 0

        let query = supabase
            .from('audit_log')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (filters.userId) {
            query = query.eq('user_id', filters.userId)
        }

        if (filters.tableName) {
            query = query.eq('table_name', filters.tableName)
        }

        if (filters.action) {
            query = query.eq('action', filters.action)
        }

        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate.toISOString())
        }

        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate.toISOString())
        }

        const { data, error, count } = await query

        if (error) throw new Error('Error al obtener logs de auditoría: ' + error.message)

        const logs = (data || []).map(log => ({
            id: log.id.toString(),
            tableName: log.table_name,
            recordId: log.record_id,
            action: log.action,
            oldData: log.old_data,
            newData: log.new_data,
            changedFields: log.changed_fields,
            userId: log.user_id,
            userIp: log.user_ip,
            sessionId: log.session_id,
            metadata: log.metadata,
            createdAt: new Date(log.created_at)
        }))

        return {
            logs,
            total: count || 0
        }
    }

    /**
     * Get active sessions for current business
     */
    async getActiveSessions(): Promise<ActiveSession[]> {
        const businessId = await this.getCurrentBusinessId()

        // Get users from this business
        const { data: users } = await supabase
            .from('user_details')
            .select('id, email, first_name, last_name')
            .eq('business_id', businessId)

        if (!users) return []

        const userIds = users.map(u => u.id)

        // Get active sessions for these users
        const { data: sessions, error } = await supabase
            .from('user_sessions')
            .select('*')
            .in('user_id', userIds)
            .order('last_activity_at', { ascending: false })

        if (error) throw new Error('Error al obtener sesiones activas: ' + error.message)

        return (sessions || []).map(session => {
            const user = users.find(u => u.id === session.user_id)
            return {
                id: session.id,
                userId: session.user_id,
                userEmail: user?.email,
                userName: user ? `${user.first_name} ${user.last_name}` : undefined,
                ipAddress: session.ip_address,
                userAgent: session.user_agent,
                lastActivity: new Date(session.last_activity_at),
                createdAt: new Date(session.created_at)
            }
        })
    }

    /**
     * Terminate a session (Admin only)
     */
    async terminateSession(sessionId: string): Promise<void> {
        const { error } = await supabase
            .from('user_sessions')
            .delete()
            .eq('id', sessionId)

        if (error) throw new Error('Error al terminar sesión: ' + error.message)
    }

    /**
     * Export audit logs to CSV
     */
    async exportAuditLogs(filters: AuditLogFilters = {}): Promise<string> {
        const { logs } = await this.getAuditLogs({ ...filters, limit: 10000 })

        // Convert to CSV
        const headers = ['Fecha/Hora', 'Usuario', 'Tabla', 'Acción', 'IP', 'Detalles']
        const rows = logs.map(log => [
            log.createdAt.toLocaleString(),
            log.userId || 'Sistema',
            log.tableName,
            log.action,
            log.userIp || '',
            log.changedFields?.join(', ') || ''
        ])

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        return csv
    }

    /**
     * Default password policy
     */
    private getDefaultPasswordPolicy(): PasswordPolicy {
        return {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSymbols: false,
            expirationDays: null,
            historyCount: 3,
            maxAttempts: 5,
            lockoutMinutes: 15
        }
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

export const securityService = new SecurityService()
