/**
 * Cash Register Service
 * Manages cash register/terminal operations (Admin)
 */

import { createClient } from '@/lib/supabase/client'

export interface CashRegister {
    id: number
    business_id: number
    location_id: number | null
    name: string
    code: string
    description: string | null
    is_active: boolean
    is_main: boolean
    hardware_config: Record<string, any>
    created_at: string
    updated_at: string
    location?: {
        name: string
    }
}

export interface CreateCashRegisterData {
    location_id: number
    name: string
    code: string
    description?: string
    is_main?: boolean
}

export interface UpdateCashRegisterData {
    name?: string
    code?: string
    description?: string
    is_active?: boolean
    is_main?: boolean
    location_id?: number
}

class CashRegisterService {
    private supabase = createClient()

    /**
     * Get all cash registers for current business
     */
    async getCashRegisters(): Promise<CashRegister[]> {
        try {
            const { data, error } = await this.supabase
                .from('cash_registers')
                .select(`
          *,
          location:locations (
            name
          )
        `)
                .order('name', { ascending: true })

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error getting cash registers:', error)
            return []
        }
    }

    /**
     * Get cash registers for a specific location
     */
    async getCashRegistersByLocation(locationId: number): Promise<CashRegister[]> {
        try {
            const { data, error } = await this.supabase
                .from('cash_registers')
                .select('*')
                .eq('location_id', locationId)
                .eq('is_active', true)
                .order('name', { ascending: true })

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Error getting cash registers by location:', error)
            return []
        }
    }

    /**
     * Get a single cash register
     */
    async getCashRegister(id: number): Promise<CashRegister | null> {
        try {
            const { data, error } = await this.supabase
                .from('cash_registers')
                .select(`
          *,
          location:locations (
            name
          )
        `)
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        } catch (error) {
            console.error('Error getting cash register:', error)
            return null
        }
    }

    /**
     * Create new cash register
     */
    async createCashRegister(registerData: CreateCashRegisterData): Promise<CashRegister> {
        try {
            const { data: { user } } = await this.supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            const { data: userData } = await this.supabase
                .from('user_details')
                .select('business_id')
                .eq('id', user.id)
                .single()

            if (!userData) throw new Error('User data not found')

            const { data, error } = await this.supabase
                .from('cash_registers')
                .insert({
                    business_id: userData.business_id,
                    location_id: registerData.location_id,
                    name: registerData.name,
                    code: registerData.code,
                    description: registerData.description,
                    is_main: registerData.is_main || false,
                    is_active: true
                })
                .select()
                .single()

            if (error) throw error
            if (!data) throw new Error('Failed to create cash register')

            return data
        } catch (error) {
            console.error('Error creating cash register:', error)
            throw error
        }
    }

    /**
     * Update cash register
     */
    async updateCashRegister(id: number, updates: UpdateCashRegisterData): Promise<CashRegister> {
        try {
            const { data, error } = await this.supabase
                .from('cash_registers')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            if (!data) throw new Error('Failed to update cash register')

            return data
        } catch (error) {
            console.error('Error updating cash register:', error)
            throw error
        }
    }

    /**
     * Delete (deactivate) cash register
     */
    async deleteCashRegister(id: number): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('cash_registers')
                .update({ is_active: false })
                .eq('id', id)

            if (error) throw error
        } catch (error) {
            console.error('Error deleting cash register:', error)
            throw error
        }
    }

    /**
     * Generate next cash register code for a business
     * Format: CAJA-001, CAJA-002, etc.
     */
    async generateNextCode(businessId: number): Promise<string> {
        try {
            const { data, error } = await this.supabase
                .from('cash_registers')
                .select('code')
                .eq('business_id', businessId)
                .order('code', { ascending: false })
                .limit(1)

            if (error) throw error

            if (!data || data.length === 0) {
                return 'CAJA-001'
            }

            const lastCode = data[0].code
            const match = lastCode.match(/CAJA-(\d+)/)

            if (match) {
                const lastNumber = parseInt(match[1])
                const nextNumber = lastNumber + 1
                return `CAJA-${String(nextNumber).padStart(3, '0')}`
            }

            return 'CAJA-001'
        } catch (error) {
            console.error('Error generating code:', error)
            return 'CAJA-001'
        }
    }

    /**
     * Auto-create a cash register for a location
     * Used during registration and location creation
     */
    async autoCreateCashRegister(locationId: number, locationName: string, isMain: boolean = false): Promise<CashRegister> {
        try {
            const { data: { user } } = await this.supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            const { data: userData } = await this.supabase
                .from('user_details')
                .select('business_id')
                .eq('id', user.id)
                .single()

            if (!userData) throw new Error('User data not found')

            const code = await this.generateNextCode(userData.business_id)
            const name = `Caja ${locationName}`

            const { data, error } = await this.supabase
                .from('cash_registers')
                .insert({
                    business_id: userData.business_id,
                    location_id: locationId,
                    name: name,
                    code: code,
                    description: `Caja principal de ${locationName}`,
                    is_main: isMain,
                    is_active: true
                })
                .select()
                .single()

            if (error) throw error
            if (!data) throw new Error('Failed to create cash register')

            return data
        } catch (error) {
            console.error('Error auto-creating cash register:', error)
            throw error
        }
    }
}

export const cashRegisterService = new CashRegisterService()
