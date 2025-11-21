/**
 * Sales Service
 * Handles all sales-related operations
 */

'use client'

import { createClient } from '../supabase/client'
import { getBusinessContext } from '../utils/business-context'
import type {
  Sale,
  SaleWithItems,
  CreateSaleData,
  SaleFilters,
  SalesListResponse,
  CreateRefundData,
  Refund,
  SaleItem,
  PaymentTransaction,
  SaleListItem
} from '../types/sales'
import { logger } from '../utils/logger'

class SalesService {
  private supabase = createClient()

  /**
   * Create a new sale
   */
  async createSale(data: CreateSaleData): Promise<SaleWithItems> {
    try {
      logger.info('Creating new sale', { locationId: data.locationId })

      // Get business context
      const { businessId, userId } = await getBusinessContext()

      // Generate sale number (format: SALE-YYYYMMDD-XXXXX)
      const saleNumber = await this.generateSaleNumber()

      // Calculate totals
      const subtotal = data.items.reduce((sum, item) => {
        return sum + (item.unitPrice * item.quantity)
      }, 0)

      const totalDiscount = data.discountAmount || data.items.reduce((sum, item) => {
        return sum + (item.discountAmount || 0)
      }, 0)

      const totalTax = data.items.reduce((sum, item) => {
        return sum + (item.taxAmount || 0)
      }, 0)

      const total = subtotal - totalDiscount + totalTax

      // Validate payment amount matches total
      const totalPayment = data.payments.reduce((sum, payment) => sum + payment.amount, 0)
      if (Math.abs(totalPayment - total) > 0.01) { // Allow 1 cent difference for rounding
        throw new Error(`Payment amount (${totalPayment}) does not match total (${total})`)
      }

      // Start transaction by inserting sale
      const { data: sale, error: saleError } = await this.supabase
        .from('sales')
        .insert({
          business_id: businessId,
          sale_number: saleNumber,
          location_id: data.locationId,
          customer_id: data.customerId,
          sold_by: userId,
          status: 'completed',
          subtotal: subtotal,
          discount_amount: totalDiscount,
          tax_amount: totalTax,
          total_amount: total,
          notes: data.notes
        })
        .select()
        .single()

      if (saleError) throw saleError
      if (!sale) throw new Error('Failed to create sale')

      logger.info('Sale created', { saleId: sale.id, saleNumber: sale.sale_number })

      // Insert sale items
      const saleItems = data.items.map(item => ({
        sale_id: sale.id,
        product_id: item.productId,
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount || 0,
        tax_amount: item.taxAmount || 0,
        line_total: (item.unitPrice * item.quantity) - (item.discountAmount || 0) + (item.taxAmount || 0),
        notes: item.notes
      }))

      const { data: items, error: itemsError } = await this.supabase
        .from('sale_items')
        .insert(saleItems)
        .select()

      if (itemsError) {
        // Rollback: delete sale if items failed
        await this.supabase.from('sales').delete().eq('id', sale.id)
        throw itemsError
      }

      logger.info('Sale items created', { count: items.length })

      // Insert payment transactions
      const payments = data.payments.map(payment => ({
        sale_id: sale.id,
        payment_method_id: payment.paymentMethodId,
        amount: payment.amount,
        reference_number: payment.reference,
        status: 'completed'
      }))

      const { data: paymentTransactions, error: paymentsError } = await this.supabase
        .from('payment_transactions')
        .insert(payments)
        .select()

      if (paymentsError) {
        // Rollback: delete sale and items if payments failed
        await this.supabase.from('sale_items').delete().eq('sale_id', sale.id)
        await this.supabase.from('sales').delete().eq('id', sale.id)
        throw paymentsError
      }

      logger.info('Payment transactions created', { count: paymentTransactions.length })

      // Reduce inventory
      await this.reduceInventory(data.locationId, data.items)

      // Return complete sale
      return this.getSaleById(sale.id)
    } catch (error) {
      logger.error('Error creating sale', { error })
      throw error
    }
  }

  /**
   * Get sale by ID with all details
   */
  async getSaleById(saleId: number): Promise<SaleWithItems> {
    try {
      const { data, error } = await this.supabase
        .from('sales')
        .select(`
          *,
          location:locations!location_id(id, name),
          customer:customers!customer_id(id, first_name, last_name),
          soldBy:user_details!sold_by(id, first_name, last_name),
          items:sale_items(
            *,
            product:products!product_id(id, name, sku)
          ),
          payments:payment_transactions(
            *,
            paymentMethod:payment_methods!payment_method_id(id, name)
          )
        `)
        .eq('id', saleId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      if (!data) throw new Error('Sale not found')

      return this.transformSale(data)
    } catch (error) {
      logger.error('Error getting sale', { error, saleId })
      throw error
    }
  }

  /**
   * Get list of sales with filters
   */
  async getSales(
    filters: SaleFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<SalesListResponse> {
    try {
      let query = this.supabase
        .from('sales')
        .select(`
          *,
          location:locations!location_id(name),
          customer:customers!customer_id(first_name, last_name),
          soldBy:user_details!sold_by(first_name, last_name),
          sale_items(count)
        `, { count: 'exact' })
        .is('deleted_at', null)

      // Apply filters
      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId)
      }
      if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId)
      }
      if (filters.soldById) {
        query = query.eq('sold_by', filters.soldById)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString())
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString())
      }
      if (filters.minTotal) {
        query = query.gte('total', filters.minTotal)
      }
      if (filters.maxTotal) {
        query = query.lte('total', filters.maxTotal)
      }
      if (filters.searchTerm) {
        query = query.ilike('sale_number', `%${filters.searchTerm}%`)
      }
      if (filters.saleNumber) {
        query = query.ilike('sale_number', `%${filters.saleNumber}%`)
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      // Order by most recent first
      query = query.order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      const sales = (data || []).map(sale => this.transformSaleListItem(sale))

      return {
        sales,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    } catch (error) {
      logger.error('Error getting sales', { error, filters })
      throw error
    }
  }

  /**
   * Cancel a sale
   */
  async cancelSale(saleId: number, reason: string): Promise<Sale> {
    try {
      logger.info('Cancelling sale', { saleId, reason })

      // Get sale details first
      const sale = await this.getSaleById(saleId)

      if (sale.status !== 'completed') {
        throw new Error('Only completed sales can be cancelled')
      }

      // Update sale status
      const { data, error } = await this.supabase
        .from('sales')
        .update({
          status: 'cancelled',
          notes: `${sale.notes || ''}\n\nCANCELLED: ${reason}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId)
        .select()
        .single()

      if (error) throw error

      // Restore inventory
      await this.restoreInventory(sale.locationId, sale.items)

      logger.info('Sale cancelled successfully', { saleId })
      return this.transformSaleBasic(data)
    } catch (error) {
      logger.error('Error cancelling sale', { error, saleId })
      throw error
    }
  }

  /**
   * Create a refund
   */
  async createRefund(data: CreateRefundData): Promise<Refund> {
    try {
      logger.info('Creating refund', { saleId: data.saleId, amount: data.amount })

      // Get sale to validate
      const sale = await this.getSaleById(data.saleId)

      if (sale.status !== 'completed') {
        throw new Error('Only completed sales can be refunded')
      }

      if (data.amount > sale.total) {
        throw new Error('Refund amount cannot exceed sale total')
      }

      // Create refund record
      const { data: refund, error } = await this.supabase
        .from('refunds')
        .insert({
          sale_id: data.saleId,
          amount: data.amount,
          reason: data.reason,
          refunded_by: (await this.supabase.auth.getUser()).data.user?.id,
          notes: data.notes
        })
        .select()
        .single()

      if (error) throw error

      // Update sale status to refunded
      await this.supabase
        .from('sales')
        .update({ status: 'refunded' })
        .eq('id', data.saleId)

      logger.info('Refund created successfully', { refundId: refund.id })
      return this.transformRefund(refund)
    } catch (error) {
      logger.error('Error creating refund', { error, data })
      throw error
    }
  }

  /**
   * Get sales statistics for a location
   */
  async getSalesStats(locationId: number, dateFrom: Date, dateTo: Date) {
    try {
      const { data, error } = await this.supabase
        .rpc('get_sales_stats', {
          p_location_id: locationId,
          p_date_from: dateFrom.toISOString(),
          p_date_to: dateTo.toISOString()
        })

      if (error) throw error

      return data
    } catch (error) {
      logger.error('Error getting sales stats', { error, locationId })
      throw error
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private async generateSaleNumber(): Promise<string> {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

    // Get count of sales today
    const { count } = await this.supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(today.setHours(0, 0, 0, 0)).toISOString())
      .lte('created_at', new Date(today.setHours(23, 59, 59, 999)).toISOString())

    const sequence = String((count || 0) + 1).padStart(5, '0')
    return `SALE-${dateStr}-${sequence}`
  }

  private async reduceInventory(locationId: number, items: CreateSaleData['items']) {
    const { businessId } = await getBusinessContext()

    for (const item of items) {
      // Get current inventory
      const { data: inventory, error: fetchError } = await this.supabase
        .from('inventory')
        .select('id, quantity_available')
        .eq('product_id', item.productId)
        .eq('location_id', locationId)
        .maybeSingle()

      if (fetchError) {
        logger.error('Error fetching inventory', { error: fetchError, item })
        continue
      }

      let inventoryId: number
      let currentQty: number = 0

      if (!inventory) {
        // Create inventory record if it doesn't exist
        const { data: newInventory, error: createError } = await this.supabase
          .from('inventory')
          .insert({
            business_id: businessId,
            product_id: item.productId,
            location_id: locationId,
            quantity_available: 0,
            min_stock_level: 0,
            reorder_point: 0
          })
          .select('id')
          .single()

        if (createError) {
          logger.error('Error creating inventory record', { error: createError, item })
          continue
        }

        inventoryId = newInventory.id
        logger.info('Created inventory record for product', { productId: item.productId, inventoryId })
      } else {
        inventoryId = inventory.id
        currentQty = inventory.quantity_available || 0
      }

      const newQuantity = Math.max(0, currentQty - item.quantity)

      const { error } = await this.supabase
        .from('inventory')
        .update({
          quantity_available: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', inventoryId)

      if (error) {
        logger.error('Error reducing inventory', { error, item })
        throw error
      }

      // Create inventory movement record
      await this.supabase
        .from('inventory_movements')
        .insert({
          business_id: businessId,
          inventory_id: inventoryId,
          movement_type: 'sale',
          quantity: -item.quantity,
          quantity_before: currentQty,
          quantity_after: newQuantity,
          reference_type: 'sale',
          notes: 'Reduccion automatica por venta',
          performed_by: (await this.supabase.auth.getUser()).data.user?.id
        })
    }
  }

  private async restoreInventory(locationId: number, items: SaleItem[]) {
    const { businessId } = await getBusinessContext()

    for (const item of items) {
      // Get current inventory
      const { data: inventory } = await this.supabase
        .from('inventory')
        .select('id, quantity_available')
        .eq('product_id', item.productId)
        .eq('location_id', locationId)
        .maybeSingle()

      if (inventory) {
        const currentQty = inventory.quantity_available || 0
        const newQuantity = currentQty + item.quantity

        await this.supabase
          .from('inventory')
          .update({
            quantity_available: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventory.id)

        // Create inventory movement record
        await this.supabase
          .from('inventory_movements')
          .insert({
            business_id: businessId,
            inventory_id: inventory.id,
            movement_type: 'adjustment',
            quantity: item.quantity,
            quantity_before: currentQty,
            quantity_after: newQuantity,
            reference_type: 'cancellation',
            notes: 'Inventario restaurado por cancelacion de venta',
            performed_by: (await this.supabase.auth.getUser()).data.user?.id
          })
      }
    }
  }

  private transformSale(data: any): SaleWithItems {
    return {
      id: data.id,
      saleNumber: data.sale_number,
      locationId: data.location_id,
      locationName: data.location?.name,
      customerId: data.customer_id,
      customerName: data.customer ? `${data.customer.first_name} ${data.customer.last_name}` : undefined,
      soldById: data.sold_by,
      soldByName: data.soldBy ? `${data.soldBy.first_name} ${data.soldBy.last_name}` : undefined,
      status: data.status,
      subtotal: data.subtotal,
      discountAmount: data.discount_amount,
      taxAmount: data.tax_amount,
      total: data.total_amount,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
      items: (data.items || []).map((item: any) => this.transformSaleItem(item)),
      payments: (data.payments || []).map((payment: any) => this.transformPayment(payment))
    }
  }

  private transformSaleBasic(data: any): Sale {
    return {
      id: data.id,
      saleNumber: data.sale_number,
      locationId: data.location_id,
      locationName: data.location?.name,
      customerId: data.customer_id,
      customerName: data.customer ? `${data.customer.first_name} ${data.customer.last_name}` : undefined,
      soldById: data.sold_by,
      soldByName: data.soldBy ? `${data.soldBy.first_name} ${data.soldBy.last_name}` : undefined,
      status: data.status,
      subtotal: data.subtotal,
      discountAmount: data.discount_amount,
      taxAmount: data.tax_amount,
      total: data.total_amount,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined
    }
  }

  private transformSaleListItem(data: any): SaleListItem {
    return {
      id: data.id,
      saleNumber: data.sale_number,
      locationId: data.location_id,
      locationName: data.location?.name,
      customerId: data.customer_id,
      customerName: data.customer ? `${data.customer.first_name} ${data.customer.last_name}` : undefined,
      soldById: data.sold_by,
      soldByName: data.soldBy ? `${data.soldBy.first_name} ${data.soldBy.last_name}` : undefined,
      status: data.status,
      subtotal: data.subtotal,
      discountAmount: data.discount_amount,
      taxAmount: data.tax_amount,
      total: data.total_amount,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
      itemCount: Array.isArray(data.sale_items) ? data.sale_items.length : 0
    }
  }

  private transformSaleItem(data: any): SaleItem {
    return {
      id: data.id,
      saleId: data.sale_id,
      productId: data.product_id,
      productName: data.product?.name,
      productSku: data.product?.sku,
      variantId: data.variant_id,
      variantName: data.variant?.name,
      quantity: data.quantity,
      unitPrice: data.unit_price,
      discountAmount: data.discount_amount || 0,
      taxAmount: data.tax_amount || 0,
      total: data.line_total || data.total,
      notes: data.notes
    }
  }

  private transformPayment(data: any): PaymentTransaction {
    return {
      id: data.id,
      saleId: data.sale_id,
      paymentMethodId: data.payment_method_id,
      paymentMethodName: data.paymentMethod?.name,
      amount: data.amount,
      reference: data.reference_number || data.reference,
      status: data.status,
      mpPaymentId: data.mp_payment_id,
      mpStatus: data.mp_status,
      mpStatusDetail: data.mp_status_detail,
      mpPaymentType: data.mp_payment_type,
      mpMetadata: data.mp_metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  private transformRefund(data: any): Refund {
    return {
      id: data.id,
      saleId: data.sale_id,
      amount: data.amount,
      reason: data.reason,
      refundedById: data.refunded_by,
      refundedByName: data.refundedBy ? `${data.refundedBy.first_name} ${data.refundedBy.last_name}` : undefined,
      notes: data.notes,
      createdAt: new Date(data.created_at)
    }
  }
}

// Export singleton instance
export const salesService = new SalesService()
export default salesService
