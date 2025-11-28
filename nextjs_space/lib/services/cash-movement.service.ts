/**
 * Cash Movements Service
 * Track cash movements during shifts (expenses, deposits, withdrawals)
 */

import { createClient } from '@/lib/supabase/client'

export type MovementType = 'opening' | 'sale' | 'refund' | 'deposit' | 'withdrawal' | 'closing'

export interface CashMovement {
    id: number
    shift_id: number
    user_id: string
    movement_type: MovementType
    amount: number
    payment_method_id: number | null
    sale_id: number | null
    description: string | null
    metadata: Record<string, any>
    created_at: string
}

export interface CreateMovementData {
    shift_id: number
    movement_type: MovementType
    amount: number
    description?: string
    payment_method_id?: number
}

class CashMovementService {
    private supabase = createClient()

    /**
     * Get movements for a specific shift
     */
    async getShiftMovements(shiftId: number): Promise<CashMovement[]> {
        try {
            const { data, error } = await this.supabase
                .from('cash_register_movements')
                .select('*')
                .eq('shift_id', shiftId)
                .order('created_at', { ascending: true })

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error getting shift movements:', error)
            return []
        }
    }

    /**
     * Create a cash movement (expense, deposit, withdrawal)
     */
    async createMovement(movementData: CreateMovementData): Promise<CashMovement> {
        try {
            const { data: { user } } = await this.supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            const { data, error } = await this.supabase
                .from('cash_register_movements')
                .insert({
                    shift_id: movementData.shift_id,
                    user_id: user.id,
                    movement_type: movementData.movement_type,
                    amount: movementData.amount,
                    description: movementData.description,
                    payment_method_id: movementData.payment_method_id,
                    metadata: {}
                })
                .select()
                .single()

            if (error) throw error
            if (!data) throw new Error('Failed to create movement')

            return data
        } catch (error) {
            console.error('Error creating movement:', error)
            throw error
        }
    }

    /**
     * Get movement summary for a shift
     */
    async getMovementSummary(shiftId: number) {
        const movements = await this.getShiftMovements(shiftId)

        const summary = {
            total_deposits: 0,
            total_withdrawals: 0,
            total_sales: 0,
            total_refunds: 0,
            net_cash_flow: 0,
            movement_count: movements.length
        }

        movements.forEach(movement => {
            const amount = Number(movement.amount)

            switch (movement.movement_type) {
                case 'deposit':
                    summary.total_deposits += amount
                    summary.net_cash_flow += amount
                    break
                case 'withdrawal':
                    summary.total_withdrawals += amount
                    summary.net_cash_flow -= amount
                    break
                case 'sale':
                    summary.total_sales += amount
                    summary.net_cash_flow += amount
                    break
                case 'refund':
                    summary.total_refunds += amount
                    summary.net_cash_flow -= amount
                    break
            }
        })

        return summary
    }

    /**
     * Delete a movement (if allowed)
     */
    async deleteMovement(movementId: number): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('cash_register_movements')
                .delete()
                .eq('id', movementId)

            if (error) throw error
        } catch (error) {
            console.error('Error deleting movement:', error)
            throw error
        }
    }
}

export const cashMovementService = new CashMovementService()
