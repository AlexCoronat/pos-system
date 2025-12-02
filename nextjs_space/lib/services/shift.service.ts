/**
 * Shift Service
 * Manages cash register shift operations
 */

import { createClient } from '@/lib/supabase/client'

export interface Shift {
    id: number
    cash_register_id: number
    user_id: string
    shift_number: string
    status: 'open' | 'suspended' | 'closed'
    opening_amount: number
    expected_amount: number | null
    actual_amount: number | null
    difference: number | null
    opened_at: string
    closed_at: string | null
    opening_notes: string | null
    closing_notes: string | null
    summary: ShiftSummary
    cash_register?: {
        name: string
        code: string
    }
    user?: {
        first_name: string
        last_name: string
    }
}

export interface ShiftSummary {
    total_sales?: number
    sales_count?: number
    cash_sales?: number
    card_sales?: number
    transfer_sales?: number
}

export interface OpenShiftData {
    cash_register_id: number
    opening_amount: number
    opening_notes?: string
}

export interface CloseShiftData {
    actual_amount: number
    closing_notes?: string
}

class ShiftService {
    private supabase = createClient()

    /**
     * Get current user's active shift
     */
    async getCurrentShift(): Promise<Shift | null> {
        try {
            const { data: { user } } = await this.supabase.auth.getUser()
            if (!user) return null

            const { data, error } = await this.supabase
                .from('cash_register_shifts')
                .select(`
          *,
          cash_register:cash_registers (
            name,
            code
          )
        `)
                .eq('user_id', user.id)
                .eq('status', 'open')
                .order('opened_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error getting current shift:', error)
            return null
        }
    }

    /**
     * Open a new shift
     */
    async openShift(shiftData: OpenShiftData): Promise<Shift> {
        try {
            const { data: { user } } = await this.supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            // Check for existing open shift
            const existingShift = await this.getCurrentShift()
            if (existingShift) {
                throw new Error('Ya tienes un turno abierto. Cierra el turno actual antes de abrir uno nuevo.')
            }

            // Generate shift number (format: SHIFT-YYYYMMDD-XXX)
            const now = new Date()
            const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
            const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
            const shift_number = `SHIFT-${dateStr}-${randomSuffix}`

            const { data, error } = await this.supabase
                .from('cash_register_shifts')
                .insert({
                    cash_register_id: shiftData.cash_register_id,
                    user_id: user.id,
                    shift_number,
                    opening_amount: shiftData.opening_amount,
                    opening_notes: shiftData.opening_notes,
                    status: 'open',
                    summary: {
                        total_sales: 0,
                        sales_count: 0,
                        cash_sales: 0,
                        card_sales: 0,
                        transfer_sales: 0
                    }
                })
                .select(`
          *,
          cash_register:cash_registers (
            name,
            code
          )
        `)
                .single()

            if (error) throw error
            if (!data) throw new Error('Failed to create shift')

            return data
        } catch (error) {
            console.error('Error opening shift:', error)
            throw error
        }
    }

    /**
     * Close current shift
     */
    async closeShift(shiftId: number, closeData: CloseShiftData): Promise<Shift> {
        try {
            // Get shift summary
            const summary = await this.getShiftSummary(shiftId)

            const expected_amount = summary.opening_amount + (summary.summary.cash_sales || 0)
            const difference = closeData.actual_amount - expected_amount

            const { data, error } = await this.supabase
                .from('cash_register_shifts')
                .update({
                    status: 'closed',
                    actual_amount: closeData.actual_amount,
                    expected_amount,
                    difference,
                    closing_notes: closeData.closing_notes,
                    closed_at: new Date().toISOString()
                })
                .eq('id', shiftId)
                .select()
                .single()

            if (error) throw error
            if (!data) throw new Error('Failed to close shift')

            return data
        } catch (error) {
            console.error('Error closing shift:', error)
            throw error
        }
    }

    /**
     * Get shift summary with sales data
     */
    async getShiftSummary(shiftId: number): Promise<Shift> {
        try {
            const { data: shift, error: shiftError } = await this.supabase
                .from('cash_register_shifts')
                .select('*, cash_register:cash_registers(name, code)')
                .eq('id', shiftId)
                .single()

            if (shiftError) throw shiftError

            // Get sales for this shift
            const { data: sales, error: salesError } = await this.supabase
                .from('sales')
                .select('total_amount, payment_transactions(payment_method:payment_methods(name), amount)')
                .eq('shift_id', shiftId)

            if (salesError) throw salesError

            // Calculate summary
            let total_sales = 0
            let cash_sales = 0
            let card_sales = 0
            let transfer_sales = 0

            sales?.forEach(sale => {
                total_sales += Number(sale.total_amount)

                sale.payment_transactions?.forEach((payment: any) => {
                    const amount = Number(payment.amount)
                    const method = payment.payment_method?.name?.toLowerCase() || ''

                    if (method.includes('efectivo') || method.includes('cash')) {
                        cash_sales += amount
                    } else if (method.includes('tarjeta') || method.includes('card')) {
                        card_sales += amount
                    } else if (method.includes('transferencia') || method.includes('transfer')) {
                        transfer_sales += amount
                    }
                })
            })

            const summary: ShiftSummary = {
                total_sales,
                sales_count: sales?.length || 0,
                cash_sales,
                card_sales,
                transfer_sales
            }

            // Update shift summary
            await this.supabase
                .from('cash_register_shifts')
                .update({ summary })
                .eq('id', shiftId)

            return {
                ...shift,
                summary
            }
        } catch (error) {
            console.error('Error getting shift summary:', error)
            // Log detailed error info
            if (error && typeof error === 'object') {
                console.error('Error details:', JSON.stringify(error, null, 2))
            }
            throw error
        }
    }

    /**
     * Get shift history
     */
    async getShiftHistory(limit: number = 20): Promise<Shift[]> {
        try {
            const { data: { user } } = await this.supabase.auth.getUser()
            if (!user) return []

            const { data, error } = await this.supabase
                .from('cash_register_shifts')
                .select(`
          *,
          cash_register:cash_registers (
            name,
            code
          )
        `)
                .eq('user_id', user.id)
                .order('opened_at', { ascending: false })
                .limit(limit)

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error getting shift history:', error)
            return []
        }
    }

    /**
     * Get all shifts (admin only)
     */
    async getAllShifts(filters?: {
        startDate?: string
        endDate?: string
        userId?: string
        cashRegisterId?: number
        status?: string
    }): Promise<Shift[]> {
        try {
            let query = this.supabase
                .from('cash_register_shifts')
                .select(`
          *,
          cash_register:cash_registers (
            name,
            code
          )
        `)

            if (filters?.startDate) {
                query = query.gte('opened_at', filters.startDate)
            }
            if (filters?.endDate) {
                query = query.lte('opened_at', filters.endDate)
            }
            if (filters?.userId) {
                query = query.eq('user_id', filters.userId)
            }
            if (filters?.cashRegisterId) {
                query = query.eq('cash_register_id', filters.cashRegisterId)
            }
            if (filters?.status) {
                query = query.eq('status', filters.status)
            }

            const { data, error } = await query.order('opened_at', { ascending: false })

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error getting all shifts:', error)
            return []
        }
    }
}

export const shiftService = new ShiftService()
