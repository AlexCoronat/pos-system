import { supabase } from '@/lib/supabase/client'
import { getBusinessContext } from '@/lib/utils/business-context'
import type {
  Customer,
  CustomerListItem,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerFilters,
  CustomersListResponse,
  CustomerPurchaseHistory,
  CustomerStats
} from '@/lib/types/customer'

class CustomerService {
  /**
   * Get all customers with optional filters and pagination
   */
  async getCustomers(
    filters: CustomerFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<CustomersListResponse> {
    try {
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)

      // Apply filters
      if (filters.searchTerm) {
        query = query.or(
          `first_name.ilike.%${filters.searchTerm}%,` +
          `last_name.ilike.%${filters.searchTerm}%,` +
          `business_name.ilike.%${filters.searchTerm}%,` +
          `email.ilike.%${filters.searchTerm}%,` +
          `phone.ilike.%${filters.searchTerm}%,` +
          `customer_number.ilike.%${filters.searchTerm}%`
        )
      }

      if (filters.type) {
        query = query.eq('type', filters.type)
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }

      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`)
      }

      if (filters.hasCredit) {
        query = query.gt('credit_limit', 0)
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      // Order by name
      query = query.order('first_name', { ascending: true })

      const { data, error, count } = await query

      if (error) throw error

      // Transform data
      const customers: CustomerListItem[] = (data || []).map(item => ({
        id: item.id,
        customerNumber: item.customer_number,
        type: item.type,
        firstName: item.first_name,
        lastName: item.last_name,
        businessName: item.business_name,
        email: item.email,
        phone: item.phone,
        mobile: item.mobile,
        city: item.city,
        creditLimit: item.credit_limit,
        currentBalance: item.current_balance,
        loyaltyPoints: item.loyalty_points,
        isActive: item.is_active ?? true,
        createdAt: new Date(item.created_at)
      }))

      return {
        customers,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    } catch (error: any) {
      console.error('Error getting customers:', error)
      throw new Error(error.message || 'Error al obtener clientes')
    }
  }

  /**
   * Get a single customer by ID
   */
  async getCustomerById(customerId: number): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      if (!data) throw new Error('Cliente no encontrado')

      return {
        id: data.id,
        customerNumber: data.customer_number,
        type: data.type,
        firstName: data.first_name,
        lastName: data.last_name,
        businessName: data.business_name,
        taxId: data.tax_id,
        email: data.email,
        phone: data.phone,
        mobile: data.mobile,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postal_code,
        country: data.country,
        birthDate: data.birth_date ? new Date(data.birth_date) : undefined,
        creditLimit: data.credit_limit,
        currentBalance: data.current_balance,
        loyaltyPoints: data.loyalty_points,
        preferredLocationId: data.preferred_location_id,
        isActive: data.is_active ?? true,
        notes: data.notes,
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined
      }
    } catch (error: any) {
      console.error('Error getting customer:', error)
      throw new Error(error.message || 'Error al obtener cliente')
    }
  }

  /**
   * Create a new customer
   */
  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    try {
      // Get business context
      const { businessId } = await getBusinessContext()

      // Generate customer number if not provided
      let customerNumber = data.customerNumber
      if (!customerNumber) {
        customerNumber = await this.generateCustomerNumber()
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          customer_number: customerNumber,
          type: data.type || 'individual',
          first_name: data.firstName,
          last_name: data.lastName,
          business_name: data.businessName,
          tax_id: data.taxId,
          email: data.email,
          phone: data.phone,
          mobile: data.mobile,
          address: data.address,
          city: data.city,
          state: data.state,
          postal_code: data.postalCode,
          country: data.country || 'Mexico',
          birth_date: data.birthDate,
          credit_limit: data.creditLimit || 0,
          current_balance: 0,
          loyalty_points: 0,
          preferred_location_id: data.preferredLocationId,
          is_active: data.isActive ?? true,
          notes: data.notes,
          metadata: data.metadata
        })
        .select()
        .single()

      if (error) throw error

      return await this.getCustomerById(customer.id)
    } catch (error: any) {
      console.error('Error creating customer:', error)
      throw new Error(error.message || 'Error al crear cliente')
    }
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(
    customerId: number,
    data: UpdateCustomerData
  ): Promise<Customer> {
    try {
      const updateData: any = {}

      if (data.customerNumber !== undefined) updateData.customer_number = data.customerNumber
      if (data.type !== undefined) updateData.type = data.type
      if (data.firstName !== undefined) updateData.first_name = data.firstName
      if (data.lastName !== undefined) updateData.last_name = data.lastName
      if (data.businessName !== undefined) updateData.business_name = data.businessName
      if (data.taxId !== undefined) updateData.tax_id = data.taxId
      if (data.email !== undefined) updateData.email = data.email
      if (data.phone !== undefined) updateData.phone = data.phone
      if (data.mobile !== undefined) updateData.mobile = data.mobile
      if (data.address !== undefined) updateData.address = data.address
      if (data.city !== undefined) updateData.city = data.city
      if (data.state !== undefined) updateData.state = data.state
      if (data.postalCode !== undefined) updateData.postal_code = data.postalCode
      if (data.country !== undefined) updateData.country = data.country
      if (data.birthDate !== undefined) updateData.birth_date = data.birthDate
      if (data.creditLimit !== undefined) updateData.credit_limit = data.creditLimit
      if (data.preferredLocationId !== undefined) updateData.preferred_location_id = data.preferredLocationId
      if (data.isActive !== undefined) updateData.is_active = data.isActive
      if (data.notes !== undefined) updateData.notes = data.notes
      if (data.metadata !== undefined) updateData.metadata = data.metadata

      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customerId)

      if (error) throw error

      return await this.getCustomerById(customerId)
    } catch (error: any) {
      console.error('Error updating customer:', error)
      throw new Error(error.message || 'Error al actualizar cliente')
    }
  }

  /**
   * Soft delete a customer
   */
  async deleteCustomer(customerId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', customerId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error deleting customer:', error)
      throw new Error(error.message || 'Error al eliminar cliente')
    }
  }

  /**
   * Search customers by name, email or phone (for autocomplete)
   */
  async searchCustomers(searchTerm: string, limit: number = 10): Promise<CustomerListItem[]> {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        return []
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .or(
          `first_name.ilike.%${searchTerm}%,` +
          `last_name.ilike.%${searchTerm}%,` +
          `business_name.ilike.%${searchTerm}%,` +
          `email.ilike.%${searchTerm}%,` +
          `phone.ilike.%${searchTerm}%`
        )
        .limit(limit)

      if (error) throw error

      return (data || []).map(item => ({
        id: item.id,
        customerNumber: item.customer_number,
        type: item.type,
        firstName: item.first_name,
        lastName: item.last_name,
        businessName: item.business_name,
        email: item.email,
        phone: item.phone,
        mobile: item.mobile,
        city: item.city,
        creditLimit: item.credit_limit,
        currentBalance: item.current_balance,
        loyaltyPoints: item.loyalty_points,
        isActive: item.is_active ?? true,
        createdAt: new Date(item.created_at)
      }))
    } catch (error: any) {
      console.error('Error searching customers:', error)
      return []
    }
  }

  /**
   * Get customer purchase history
   */
  async getCustomerPurchaseHistory(
    customerId: number,
    limit: number = 20
  ): Promise<CustomerPurchaseHistory[]> {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          sale_number,
          created_at,
          total_amount,
          status,
          sale_items(id)
        `)
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map(sale => ({
        saleId: sale.id,
        saleNumber: sale.sale_number,
        date: new Date(sale.created_at),
        total: sale.total_amount || 0,
        itemCount: sale.sale_items?.length || 0,
        status: sale.status
      }))
    } catch (error: any) {
      console.error('Error getting purchase history:', error)
      throw new Error(error.message || 'Error al obtener historial de compras')
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(customerId: number): Promise<CustomerStats> {
    try {
      // Get customer data
      const customer = await this.getCustomerById(customerId)

      // Get sales data
      const { data: salesData, error } = await supabase
        .from('sales')
        .select('id, total_amount, created_at')
        .eq('customer_id', customerId)
        .eq('status', 'completed')
        .is('deleted_at', null)

      if (error) throw error

      const sales = salesData || []
      const totalPurchases = sales.length
      const totalSpent = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
      const averageTicket = totalPurchases > 0 ? totalSpent / totalPurchases : 0
      const lastPurchase = sales.length > 0
        ? new Date(Math.max(...sales.map(s => new Date(s.created_at).getTime())))
        : undefined

      return {
        totalPurchases,
        totalSpent,
        averageTicket,
        lastPurchaseDate: lastPurchase,
        loyaltyPoints: customer.loyaltyPoints || 0
      }
    } catch (error: any) {
      console.error('Error getting customer stats:', error)
      throw new Error(error.message || 'Error al obtener estadisticas')
    }
  }

  /**
   * Update customer balance
   */
  async updateBalance(customerId: number, amount: number): Promise<void> {
    try {
      const customer = await this.getCustomerById(customerId)
      const newBalance = (customer.currentBalance || 0) + amount

      const { error } = await supabase
        .from('customers')
        .update({ current_balance: newBalance })
        .eq('id', customerId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error updating balance:', error)
      throw new Error(error.message || 'Error al actualizar saldo')
    }
  }

  /**
   * Add loyalty points
   */
  async addLoyaltyPoints(customerId: number, points: number): Promise<void> {
    try {
      const customer = await this.getCustomerById(customerId)
      const newPoints = (customer.loyaltyPoints || 0) + points

      const { error } = await supabase
        .from('customers')
        .update({ loyalty_points: newPoints })
        .eq('id', customerId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error adding loyalty points:', error)
      throw new Error(error.message || 'Error al agregar puntos')
    }
  }

  /**
   * Generate a unique customer number
   */
  private async generateCustomerNumber(): Promise<string> {
    const prefix = 'CLI'
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${prefix}-${timestamp}${random}`
  }

  /**
   * Check if email is already in use
   */
  async checkEmailExists(email: string, excludeCustomerId?: number): Promise<boolean> {
    try {
      let query = supabase
        .from('customers')
        .select('id')
        .eq('email', email)
        .is('deleted_at', null)

      if (excludeCustomerId) {
        query = query.neq('id', excludeCustomerId)
      }

      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return !!data
    } catch (error: any) {
      console.error('Error checking email:', error)
      return false
    }
  }
}

export const customerService = new CustomerService()
