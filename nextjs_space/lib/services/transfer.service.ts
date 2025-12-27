/**
 * Transfer Service
 * Handles inventory transfer operations between locations
 */

import { supabase } from '@/lib/supabase/client'
import { getBusinessContext } from '@/lib/utils/business-context'
import type {
    Transfer,
    TransferItem,
    TransferListItem,
    CreateTransferData,
    ApproveTransferData,
    ShipTransferData,
    ReceiveTransferData,
    TransferFilters,
    TransferStatus
} from '@/lib/types/transfer'
import { inventoryService } from './inventory.service'

class TransferService {
    /**
     * Get current user's business ID
     */
    private async getBusinessId(): Promise<number> {
        const context = await getBusinessContext()
        if (!context.businessId) {
            throw new Error('No se encontró el negocio del usuario')
        }
        return context.businessId
    }

    /**
     * Get current user ID
     */
    private async getUserId(): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            throw new Error('Usuario no autenticado')
        }
        return user.id
    }

    /**
     * Generate a new transfer number
     */
    private async generateTransferNumber(): Promise<string> {
        const businessId = await this.getBusinessId()
        const { data, error } = await supabase.rpc('generate_transfer_number', {
            p_business_id: businessId
        })

        if (error) throw error
        return data as string
    }

    /**
     * Create a new transfer request
     */
    async createTransfer(data: CreateTransferData): Promise<Transfer> {
        try {
            const businessId = await this.getBusinessId()
            const userId = await this.getUserId()
            const transferNumber = await this.generateTransferNumber()

            // Calculate expiration if not provided (default 24 hours)
            const expiresAt = data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)

            // Insert transfer
            const { data: transfer, error: transferError } = await supabase
                .from('inventory_transfers')
                .insert({
                    transfer_number: transferNumber,
                    from_location_id: data.fromLocationId,
                    to_location_id: data.toLocationId,
                    transfer_type: data.transferType,
                    priority: data.priority || 'normal',
                    origin_sale_id: data.originSaleId || null,
                    status: 'pending',
                    requested_by: userId,
                    request_notes: data.requestNotes || null,
                    expires_at: expiresAt.toISOString(),
                    business_id: businessId
                })
                .select()
                .single()

            if (transferError) throw transferError

            // Insert items
            const itemsToInsert = data.items.map(item => ({
                transfer_id: transfer.id,
                product_id: item.productId,
                variant_id: item.variantId || null,
                quantity_requested: item.quantityRequested,
                notes: item.notes || null
            }))

            const { error: itemsError } = await supabase
                .from('inventory_transfer_items')
                .insert(itemsToInsert)

            if (itemsError) throw itemsError

            return this.getTransferById(transfer.id) as Promise<Transfer>
        } catch (error: any) {
            console.error('Error creating transfer:', error)
            throw new Error(error.message || 'Error al crear la transferencia')
        }
    }

    /**
     * Get a transfer by ID with all details
     */
    async getTransferById(transferId: number): Promise<Transfer | null> {
        try {
            const { data, error } = await supabase
                .from('inventory_transfers')
                .select(`
          *,
          from_location:locations!from_location_id(id, name),
          to_location:locations!to_location_id(id, name),
          items:inventory_transfer_items(
            id,
            product_id,
            variant_id,
            quantity_requested,
            quantity_approved,
            quantity_shipped,
            quantity_received,
            notes,
            product:products(id, name, sku)
          )
        `)
                .eq('id', transferId)
                .single()

            if (error) {
                if (error.code === 'PGRST116') return null
                throw error
            }

            return this.mapTransferFromDb(data)
        } catch (error: any) {
            console.error('Error getting transfer:', error)
            throw new Error(error.message || 'Error al obtener la transferencia')
        }
    }

    /**
     * Get transfers list with filters
     */
    async getTransfers(filters: TransferFilters = {}): Promise<TransferListItem[]> {
        try {
            let query = supabase
                .from('inventory_transfers')
                .select(`
          id,
          transfer_number,
          status,
          transfer_type,
          priority,
          requested_at,
          expires_at,
          requested_by,
          from_location:locations!from_location_id(name),
          to_location:locations!to_location_id(name),
          items:inventory_transfer_items(quantity_requested)
        `)
                .order('requested_at', { ascending: false })

            // Apply filters
            if (filters.status) {
                if (Array.isArray(filters.status)) {
                    query = query.in('status', filters.status)
                } else {
                    query = query.eq('status', filters.status)
                }
            }

            if (filters.fromLocationId) {
                query = query.eq('from_location_id', filters.fromLocationId)
            }

            if (filters.toLocationId) {
                query = query.eq('to_location_id', filters.toLocationId)
            }

            if (filters.transferType) {
                query = query.eq('transfer_type', filters.transferType)
            }

            if (filters.priority) {
                query = query.eq('priority', filters.priority)
            }

            if (filters.dateFrom) {
                query = query.gte('requested_at', filters.dateFrom.toISOString())
            }

            if (filters.dateTo) {
                query = query.lte('requested_at', filters.dateTo.toISOString())
            }

            const { data, error } = await query

            if (error) throw error

            return (data || []).map((item: any) => ({
                id: item.id,
                transferNumber: item.transfer_number,
                fromLocationName: item.from_location?.name || 'Desconocida',
                toLocationName: item.to_location?.name || 'Desconocida',
                status: item.status,
                transferType: item.transfer_type,
                priority: item.priority,
                itemCount: item.items?.length || 0,
                totalQuantity: item.items?.reduce((sum: number, i: any) => sum + i.quantity_requested, 0) || 0,
                requestedAt: new Date(item.requested_at),
                expiresAt: item.expires_at ? new Date(item.expires_at) : null,
                requestedByName: 'Usuario'
            }))
        } catch (error: any) {
            console.error('Error getting transfers:', error)
            throw new Error(error.message || 'Error al obtener transferencias')
        }
    }

    /**
     * Get pending requests for a location (to approve/reject)
     */
    async getPendingRequestsForLocation(locationId: number): Promise<TransferListItem[]> {
        return this.getTransfers({
            fromLocationId: locationId,
            status: 'pending'
        })
    }

    /**
     * Get incoming transfers for a location (to receive)
     */
    async getIncomingTransfers(locationId: number): Promise<TransferListItem[]> {
        return this.getTransfers({
            toLocationId: locationId,
            status: ['approved', 'in_transit']
        })
    }

    /**
     * Approve a transfer request
     */
    async approveTransfer(transferId: number, data: ApproveTransferData): Promise<void> {
        try {
            const userId = await this.getUserId()

            // Update item quantities
            for (const item of data.items) {
                const { error: itemError } = await supabase
                    .from('inventory_transfer_items')
                    .update({ quantity_approved: item.quantityApproved })
                    .eq('id', item.itemId)

                if (itemError) throw itemError
            }

            // Update transfer status
            const { error: transferError } = await supabase
                .from('inventory_transfers')
                .update({
                    status: 'approved',
                    approved_by: userId,
                    approved_at: new Date().toISOString()
                })
                .eq('id', transferId)

            if (transferError) throw transferError
        } catch (error: any) {
            console.error('Error approving transfer:', error)
            throw new Error(error.message || 'Error al aprobar la transferencia')
        }
    }

    /**
     * Reject a transfer request
     */
    async rejectTransfer(transferId: number, reason: string): Promise<void> {
        try {
            const userId = await this.getUserId()

            const { error } = await supabase
                .from('inventory_transfers')
                .update({
                    status: 'rejected',
                    rejected_by: userId,
                    rejected_at: new Date().toISOString(),
                    rejection_reason: reason
                })
                .eq('id', transferId)

            if (error) throw error
        } catch (error: any) {
            console.error('Error rejecting transfer:', error)
            throw new Error(error.message || 'Error al rechazar la transferencia')
        }
    }

    /**
     * Ship a transfer (mark as in transit)
     */
    async shipTransfer(transferId: number, data: ShipTransferData): Promise<void> {
        try {
            const userId = await this.getUserId()
            const transfer = await this.getTransferById(transferId)

            if (!transfer) throw new Error('Transferencia no encontrada')

            // Update item quantities shipped
            for (const item of data.items) {
                const { error: itemError } = await supabase
                    .from('inventory_transfer_items')
                    .update({ quantity_shipped: item.quantityShipped })
                    .eq('id', item.itemId)

                if (itemError) throw itemError
            }

            // Reduce inventory at source location
            for (const item of data.items) {
                const transferItem = transfer.items?.find(i => i.id === item.itemId)
                if (transferItem && item.quantityShipped > 0) {
                    await inventoryService.adjustInventory({
                        productId: transferItem.productId,
                        locationId: transfer.fromLocationId,
                        variantId: transferItem.variantId,
                        quantity: -item.quantityShipped,
                        movementType: 'exit',
                        notes: `Transferencia saliente ${transfer.transferNumber}`
                    })
                }
            }

            // Update transfer status
            const { error: transferError } = await supabase
                .from('inventory_transfers')
                .update({
                    status: 'in_transit',
                    shipped_by: userId,
                    shipped_at: new Date().toISOString(),
                    shipping_notes: data.shippingNotes || null
                })
                .eq('id', transferId)

            if (transferError) throw transferError
        } catch (error: any) {
            console.error('Error shipping transfer:', error)
            throw new Error(error.message || 'Error al enviar la transferencia')
        }
    }

    /**
     * Receive a transfer (confirm receipt at destination)
     */
    async receiveTransfer(transferId: number, data: ReceiveTransferData): Promise<void> {
        try {
            const userId = await this.getUserId()
            const transfer = await this.getTransferById(transferId)

            if (!transfer) throw new Error('Transferencia no encontrada')

            // Update item quantities received
            for (const item of data.items) {
                const { error: itemError } = await supabase
                    .from('inventory_transfer_items')
                    .update({ quantity_received: item.quantityReceived })
                    .eq('id', item.itemId)

                if (itemError) throw itemError
            }

            // Add inventory at destination location
            for (const item of data.items) {
                const transferItem = transfer.items?.find(i => i.id === item.itemId)
                if (transferItem && item.quantityReceived > 0) {
                    await inventoryService.adjustInventory({
                        productId: transferItem.productId,
                        locationId: transfer.toLocationId,
                        variantId: transferItem.variantId,
                        quantity: item.quantityReceived,
                        movementType: 'entry',
                        notes: `Transferencia entrante ${transfer.transferNumber}`
                    })
                }
            }

            // Determine if fully or partially received
            const allReceived = data.items.every((item, idx) => {
                const transferItem = transfer.items?.[idx]
                return transferItem && item.quantityReceived >= transferItem.quantityShipped
            })

            // Update transfer status
            const { error: transferError } = await supabase
                .from('inventory_transfers')
                .update({
                    status: allReceived ? 'received' : 'partially_received',
                    received_by: userId,
                    received_at: new Date().toISOString(),
                    receiving_notes: data.receivingNotes || null
                })
                .eq('id', transferId)

            if (transferError) throw transferError
        } catch (error: any) {
            console.error('Error receiving transfer:', error)
            throw new Error(error.message || 'Error al recibir la transferencia')
        }
    }

    /**
     * Cancel a transfer
     */
    async cancelTransfer(transferId: number, reason?: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('inventory_transfers')
                .update({
                    status: 'cancelled',
                    rejection_reason: reason || 'Cancelada por el usuario'
                })
                .eq('id', transferId)
                .in('status', ['pending', 'approved']) // Can only cancel pending or approved

            if (error) throw error
        } catch (error: any) {
            console.error('Error cancelling transfer:', error)
            throw new Error(error.message || 'Error al cancelar la transferencia')
        }
    }

    /**
     * Map database record to Transfer type
     */
    private mapTransferFromDb(data: any): Transfer {
        return {
            id: data.id,
            transferNumber: data.transfer_number,
            fromLocationId: data.from_location_id,
            fromLocationName: data.from_location?.name,
            toLocationId: data.to_location_id,
            toLocationName: data.to_location?.name,
            transferType: data.transfer_type,
            priority: data.priority,
            originSaleId: data.origin_sale_id,
            status: data.status,
            requestedBy: data.requested_by,
            requestedByName: 'Usuario',
            approvedBy: data.approved_by,
            approvedByName: data.approved_by ? 'Usuario' : undefined,
            rejectedBy: data.rejected_by,
            rejectedByName: data.rejected_by ? 'Usuario' : undefined,
            shippedBy: data.shipped_by,
            shippedByName: data.shipped_by ? 'Usuario' : undefined,
            receivedBy: data.received_by,
            receivedByName: data.received_by ? 'Usuario' : undefined,
            requestedAt: new Date(data.requested_at),
            expiresAt: data.expires_at ? new Date(data.expires_at) : null,
            approvedAt: data.approved_at ? new Date(data.approved_at) : null,
            rejectedAt: data.rejected_at ? new Date(data.rejected_at) : null,
            shippedAt: data.shipped_at ? new Date(data.shipped_at) : null,
            receivedAt: data.received_at ? new Date(data.received_at) : null,
            requestNotes: data.request_notes,
            rejectionReason: data.rejection_reason,
            shippingNotes: data.shipping_notes,
            receivingNotes: data.receiving_notes,
            items: data.items?.map((item: any) => ({
                id: item.id,
                transferId: data.id,
                productId: item.product_id,
                productName: item.product?.name,
                productSku: item.product?.sku,
                variantId: item.variant_id,
                variantName: item.variant?.name,
                quantityRequested: item.quantity_requested,
                quantityApproved: item.quantity_approved,
                quantityShipped: item.quantity_shipped,
                quantityReceived: item.quantity_received,
                notes: item.notes
            })),
            businessId: data.business_id,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        }
    }
}

export const transferService = new TransferService()
