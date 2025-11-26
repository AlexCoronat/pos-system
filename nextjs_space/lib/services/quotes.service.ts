import { supabase } from '@/lib/supabase/client'
import { getBusinessContext } from '@/lib/utils/business-context'
import { Customer } from '@/lib/types/customer'

export type QuoteStatus = 'draft' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'

export interface QuoteItem {
    id?: number
    quote_id?: number
    product_id: number
    quantity: number
    unit_price: number
    discount_amount: number
    tax_rate: number
    tax_amount: number
    subtotal: number
    notes?: string
    created_at?: string
}

export interface Quote {
    id: number
    business_id: number
    quote_number: string
    customer_id: number
    location_id?: number
    created_by?: string
    quote_date: string
    expiry_date?: string
    status: QuoteStatus
    subtotal: number
    discount_amount: number
    tax_amount: number
    total_amount: number
    currency: string
    notes?: string
    internal_notes?: string
    terms_and_conditions?: string
    delivery_time?: string
    payment_method?: string
    converted_to_sale_id?: number
    converted_at?: string
    approved_by?: string
    approved_at?: string
    metadata?: Record<string, any>
    created_at: string
    updated_at: string
    deleted_at?: string
    items?: QuoteItem[]
}

export interface QuoteWithDetails extends Quote {
    customer?: Customer
    items?: QuoteItem[]
}

export interface CreateQuoteData {
    customer_id?: number
    location_id?: number
    created_by?: string
    quote_date: string
    expiry_date?: string
    status?: QuoteStatus
    notes?: string
    internal_notes?: string
    terms_and_conditions?: string
    delivery_time?: string
    payment_method?: string
    items: {
        product_id: number
        quantity: number
        unit_price: number
        discount_amount?: number
        tax_rate?: number
        notes?: string
    }[]
}

export interface UpdateQuoteData {
    customer_id?: number
    location_id?: number
    quote_date?: string
    expiry_date?: string
    status?: QuoteStatus
    notes?: string
    internal_notes?: string
    terms_and_conditions?: string
    delivery_time?: string
    payment_method?: string
    items?: {
        id?: number
        product_id: number
        quantity: number
        unit_price: number
        discount_amount?: number
        tax_rate?: number
        notes?: string
    }[]
}

export interface QuoteFilters {
    search?: string
    status?: QuoteStatus
    customerId?: number
    dateFrom?: string
    dateTo?: string
}

export interface QuotesListResponse {
    quotes: QuoteWithDetails[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

export interface QuoteStats {
    total: number
    pending: number
    accepted: number
    converted: number
    totalValue: number
    conversionRate: number
}

class QuotesService {
    /**
     * Get quotes with filters and pagination
     */
    async getQuotes(
        filters: QuoteFilters = {},
        page: number = 1,
        pageSize: number = 20
    ): Promise<QuotesListResponse> {
        try {
            const { businessId } = await getBusinessContext()

            let query = supabase
                .from('quotes')
                .select(`
          *,
          customer:customers(*)
        `, { count: 'exact' })
                .eq('business_id', businessId)

            // Apply filters
            if (filters.status) {
                query = query.eq('status', filters.status)
            }

            if (filters.customerId) {
                query = query.eq('customer_id', filters.customerId)
            }

            if (filters.dateFrom) {
                query = query.gte('quote_date', filters.dateFrom)
            }

            if (filters.dateTo) {
                query = query.lte('quote_date', filters.dateTo)
            }

            if (filters.search) {
                query = query.or(`quote_number.ilike.%${filters.search}%`)
                // Note: Searching by customer name would require a join filter which is complex in Supabase simple client
                // For now we search by quote number
            }

            // Pagination
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1
            query = query.range(from, to)

            // Order
            query = query.order('created_at', { ascending: false })

            const { data, error, count } = await query

            if (error) throw error

            // Transform data to match QuoteWithDetails
            // We need to map the customer response to our Customer type if needed
            // But for now assuming the shape matches enough or we cast it
            const quotes = (data || []).map(q => ({
                ...q,
                // Map customer fields if necessary, e.g. snake_case to camelCase
                customer: q.customer ? {
                    id: q.customer.id,
                    firstName: q.customer.first_name,
                    lastName: q.customer.last_name,
                    businessName: q.customer.business_name,
                    email: q.customer.email,
                    phone: q.customer.phone,
                    city: q.customer.city,
                    // ... other fields
                } : undefined
            })) as QuoteWithDetails[]

            return {
                quotes,
                total: count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((count || 0) / pageSize)
            }
        } catch (error: any) {
            console.error('Error getting quotes:', error)
            throw new Error(error.message || 'Error getting quotes')
        }
    }

    /**
     * Get a single quote by ID with items
     */
    async getQuoteById(id: number): Promise<QuoteWithDetails> {
        try {
            const { data, error } = await supabase
                .from('quotes')
                .select(`
          *,
          customer:customers(*),
          items:quote_items(*)
        `)
                .eq('id', id)
                .single()

            if (error) throw error

            // Transform
            const quote: QuoteWithDetails = {
                ...data,
                customer: data.customer ? {
                    id: data.customer.id,
                    firstName: data.customer.first_name,
                    lastName: data.customer.last_name,
                    businessName: data.customer.business_name,
                    email: data.customer.email,
                    phone: data.customer.phone,
                    city: data.customer.city,
                } : undefined,
                items: data.items
            }

            return quote
        } catch (error: any) {
            console.error('Error getting quote:', error)
            throw new Error(error.message || 'Error getting quote')
        }
    }

    /**
     * Create a new quote
     */
    async createQuote(data: CreateQuoteData): Promise<Quote> {
        try {
            const { businessId } = await getBusinessContext()
            const quoteNumber = await this.generateQuoteNumber(businessId)

            // Calculate totals
            const items = data.items
            let subtotal = 0
            let discountAmount = 0
            let taxAmount = 0

            const calculatedItems = items.map(item => {
                const itemSubtotal = item.quantity * item.unit_price
                const itemDiscount = item.discount_amount || 0
                const itemTaxRate = item.tax_rate || 16
                const itemTax = (itemSubtotal - itemDiscount) * (itemTaxRate / 100)

                subtotal += itemSubtotal
                discountAmount += itemDiscount
                taxAmount += itemTax

                return {
                    ...item,
                    subtotal: itemSubtotal, // Base subtotal
                    tax_amount: itemTax,
                    tax_rate: itemTaxRate,
                    discount_amount: itemDiscount
                }
            })

            const totalAmount = subtotal - discountAmount + taxAmount

            // 1. Create Quote
            const { data: quote, error: quoteError } = await supabase
                .from('quotes')
                .insert({
                    business_id: businessId,
                    quote_number: quoteNumber,
                    customer_id: data.customer_id,
                    location_id: data.location_id,
                    created_by: data.created_by,
                    quote_date: data.quote_date,
                    expiry_date: data.expiry_date,
                    status: data.status || 'draft',
                    subtotal,
                    discount_amount: discountAmount,
                    tax_amount: taxAmount,
                    total_amount: totalAmount,
                    notes: data.notes,
                    internal_notes: data.internal_notes,
                    terms_and_conditions: data.terms_and_conditions,
                    delivery_time: data.delivery_time,
                    payment_method: data.payment_method
                })
                .select()
                .single()

            if (quoteError) throw quoteError

            // 2. Create Items
            if (calculatedItems.length > 0) {
                const { error: itemsError } = await supabase
                    .from('quote_items')
                    .insert(
                        calculatedItems.map(item => ({
                            quote_id: quote.id,
                            product_id: item.product_id,
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                            discount_amount: item.discount_amount,
                            tax_rate: item.tax_rate,
                            tax_amount: item.tax_amount,
                            subtotal: item.subtotal,
                            notes: item.notes
                        }))
                    )

                if (itemsError) throw itemsError
            }

            return quote
        } catch (error: any) {
            console.error('Error creating quote:', error)
            throw new Error(error.message || 'Error creating quote')
        }
    }

    /**
     * Update a quote
     */
    async updateQuote(id: number, data: UpdateQuoteData): Promise<Quote> {
        try {
            // First get existing items to handle updates/deletes if necessary
            // For simplicity, we might delete all and recreate, or update intelligently
            // Here we'll implement a "replace items" strategy for simplicity in this MVP

            // Calculate new totals
            let subtotal = 0
            let discountAmount = 0
            let taxAmount = 0

            const calculatedItems = data.items ? data.items.map(item => {
                const itemSubtotal = item.quantity * item.unit_price
                const itemDiscount = item.discount_amount || 0
                const itemTaxRate = item.tax_rate || 16
                const itemTax = (itemSubtotal - itemDiscount) * (itemTaxRate / 100)

                subtotal += itemSubtotal
                discountAmount += itemDiscount
                taxAmount += itemTax

                return {
                    ...item,
                    subtotal: itemSubtotal,
                    tax_amount: itemTax,
                    tax_rate: itemTaxRate,
                    discount_amount: itemDiscount
                }
            }) : []

            const totalAmount = subtotal - discountAmount + taxAmount

            // Update Quote Header
            const updateData: any = {
                updated_at: new Date().toISOString()
            }
            if (data.customer_id) updateData.customer_id = data.customer_id
            if (data.quote_date) updateData.quote_date = data.quote_date
            if (data.expiry_date) updateData.expiry_date = data.expiry_date
            if (data.status) updateData.status = data.status
            if (data.notes !== undefined) updateData.notes = data.notes
            if (data.internal_notes !== undefined) updateData.internal_notes = data.internal_notes
            if (data.terms_and_conditions !== undefined) updateData.terms_and_conditions = data.terms_and_conditions

            if (data.items) {
                updateData.subtotal = subtotal
                updateData.discount_amount = discountAmount
                updateData.tax_amount = taxAmount
                updateData.total_amount = totalAmount
            }

            const { data: quote, error: quoteError } = await supabase
                .from('quotes')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (quoteError) throw quoteError

            // Update Items if provided
            if (data.items) {
                // Delete existing items
                await supabase.from('quote_items').delete().eq('quote_id', id)

                // Insert new items
                if (calculatedItems.length > 0) {
                    const { error: itemsError } = await supabase
                        .from('quote_items')
                        .insert(
                            calculatedItems.map(item => ({
                                quote_id: id,
                                product_id: item.product_id,
                                quantity: item.quantity,
                                unit_price: item.unit_price,
                                discount_amount: item.discount_amount,
                                tax_rate: item.tax_rate,
                                tax_amount: item.tax_amount,
                                subtotal: item.subtotal,
                                notes: item.notes
                            }))
                        )
                    if (itemsError) throw itemsError
                }
            }

            return quote
        } catch (error: any) {
            console.error('Error updating quote:', error)
            throw new Error(error.message || 'Error updating quote')
        }
    }

    /**
     * Delete a quote (hard delete)
     * WARNING: This permanently deletes the quote and all its items
     */
    async deleteQuote(id: number): Promise<void> {
        try {
            // Hard delete - permanently removes the quote from database
            // quote_items are automatically deleted due to ON DELETE CASCADE
            const { error } = await supabase
                .from('quotes')
                .delete()
                .eq('id', id)

            if (error) throw error
        } catch (error: any) {
            console.error('Error deleting quote:', error)
            throw new Error(error.message || 'Error deleting quote')
        }
    }

    /**
     * Change quote status
     */
    async changeStatus(id: number, status: QuoteStatus): Promise<void> {
        try {
            const { error } = await supabase
                .from('quotes')
                .update({ status })
                .eq('id', id)

            if (error) throw error
        } catch (error: any) {
            console.error('Error changing status:', error)
            throw new Error(error.message || 'Error changing status')
        }
    }

    /**
     * Convert quote to sale
     */
    async convertToSale(id: number): Promise<number> {
        try {
            // 1. Get quote details
            const quote = await this.getQuoteById(id)

            if (quote.status === 'converted') {
                throw new Error('Quote already converted')
            }

            // 2. Create Sale (using RPC or direct insert - assuming direct insert for now)
            // Note: This assumes a sales table structure. 
            // Ideally we should call salesService.createSale() but to avoid circular dependency we might do it here or use a higher level use case.
            // For now, let's just mark it as converted and assume the UI handles the creation or we do a basic insert.

            // Let's just update the status for now, as the actual conversion logic might be complex
            // and involve the sales module.
            // Or we can insert into sales.

            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .insert({
                    business_id: quote.business_id,
                    customer_id: quote.customer_id,
                    location_id: quote.location_id,
                    status: 'completed',
                    total_amount: quote.total_amount,
                    subtotal: quote.subtotal,
                    tax_amount: quote.tax_amount,
                    discount_amount: quote.discount_amount,
                    payment_status: 'pending',
                    metadata: { converted_from_quote_id: id }
                })
                .select()
                .single()

            if (saleError) throw saleError

            // 3. Create Sale Items
            if (quote.items && quote.items.length > 0) {
                const saleItems = quote.items.map(item => ({
                    sale_id: sale.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                    tax_amount: item.tax_amount,
                    discount_amount: item.discount_amount
                }))

                const { error: itemsError } = await supabase
                    .from('sale_items')
                    .insert(saleItems)

                if (itemsError) throw itemsError
            }

            // 4. Update Quote
            await supabase
                .from('quotes')
                .update({
                    status: 'converted',
                    converted_to_sale_id: sale.id,
                    converted_at: new Date().toISOString()
                })
                .eq('id', id)

            return sale.id
        } catch (error: any) {
            console.error('Error converting quote:', error)
            throw new Error(error.message || 'Error converting quote')
        }
    }

    /**
     * Get quote statistics
     */
    async getQuoteStats(): Promise<QuoteStats> {
        try {
            const { businessId } = await getBusinessContext()

            const { data, error } = await supabase
                .from('quotes')
                .select('status, total_amount')
                .eq('business_id', businessId)

            if (error) throw error

            const stats = {
                total: data.length,
                pending: data.filter(q => q.status === 'pending' || q.status === 'draft').length,
                accepted: data.filter(q => q.status === 'accepted').length,
                converted: data.filter(q => q.status === 'converted').length,
                totalValue: data.reduce((sum, q) => sum + (q.total_amount || 0), 0),
                conversionRate: 0
            }

            if (stats.total > 0) {
                stats.conversionRate = Math.round((stats.converted / stats.total) * 100)
            }

            return stats
        } catch (error: any) {
            console.error('Error getting stats:', error)
            return {
                total: 0,
                pending: 0,
                accepted: 0,
                converted: 0,
                totalValue: 0,
                conversionRate: 0
            }
        }
    }

    /**
     * Generate next quote number
     */
    async generateQuoteNumber(businessId: number): Promise<string> {
        // QT-{YEAR}-{SEQUENCE}
        const year = new Date().getFullYear()
        const { count } = await supabase
            .from('quotes')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .gte('created_at', `${year}-01-01`)

        const sequence = (count || 0) + 1
        return `QT-${year}-${sequence.toString().padStart(5, '0')}`
    }
}

export const quotesService = new QuotesService()
