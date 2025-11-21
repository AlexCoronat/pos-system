import { supabase } from '@/lib/supabase/client'
import { getBusinessContext } from '@/lib/utils/business-context'
import type { InventoryItem } from '@/lib/types/product'

export interface InventoryMovement {
  id: number
  inventoryId: number
  movementType: 'entry' | 'exit' | 'adjustment' | 'transfer'
  quantity: number
  referenceType?: string
  referenceId?: number
  notes?: string
  createdBy: string
  createdAt: Date
}

export interface InventoryAdjustment {
  productId: number
  variantId?: number
  locationId: number
  quantity: number
  movementType: 'entry' | 'exit' | 'adjustment'
  notes?: string
}

export interface InventoryTransfer {
  productId: number
  variantId?: number
  fromLocationId: number
  toLocationId: number
  quantity: number
  notes?: string
}

export interface InventoryFilters {
  locationId?: number
  productId?: number
  lowStock?: boolean // Items below reorder point
}

export interface InventoryWithProduct extends InventoryItem {
  productName: string
  productSku: string
  variantName?: string
}

class InventoryService {
  /**
   * Get inventory items with optional filters
   */
  async getInventory(filters: InventoryFilters = {}): Promise<InventoryWithProduct[]> {
    try {
      let query = supabase
        .from('inventory')
        .select(`
          *,
          product:products!inner(
            id,
            name,
            sku
          ),
          variant:product_variants(
            id,
            name
          )
        `)

      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId)
      }

      if (filters.productId) {
        query = query.eq('product_id', filters.productId)
      }

      const { data, error } = await query

      if (error) throw error

      let inventory: InventoryWithProduct[] = (data || []).map(item => ({
        id: item.id,
        productId: item.product_id,
        variantId: item.variant_id,
        locationId: item.location_id,
        quantity: item.quantity,
        minStockLevel: item.min_stock_level,
        reorderPoint: item.reorder_point,
        lastRestocked: item.last_restocked ? new Date(item.last_restocked) : undefined,
        productName: item.product.name,
        productSku: item.product.sku,
        variantName: item.variant?.name
      }))

      // Apply low stock filter if requested
      if (filters.lowStock) {
        inventory = inventory.filter(item => item.quantity <= item.reorderPoint)
      }

      return inventory
    } catch (error: any) {
      console.error('Error getting inventory:', error)
      throw new Error(error.message || 'Error al obtener inventario')
    }
  }

  /**
   * Get inventory for a specific product at a location
   */
  async getInventoryByProduct(
    productId: number,
    locationId: number,
    variantId?: number
  ): Promise<InventoryItem | null> {
    try {
      let query = supabase
        .from('inventory')
        .select('*')
        .eq('product_id', productId)
        .eq('location_id', locationId)

      if (variantId) {
        query = query.eq('variant_id', variantId)
      } else {
        query = query.is('variant_id', null)
      }

      const { data, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null
        }
        throw error
      }

      return {
        id: data.id,
        productId: data.product_id,
        variantId: data.variant_id,
        locationId: data.location_id,
        quantity: data.quantity,
        minStockLevel: data.min_stock_level,
        reorderPoint: data.reorder_point,
        lastRestocked: data.last_restocked ? new Date(data.last_restocked) : undefined
      }
    } catch (error: any) {
      console.error('Error getting inventory:', error)
      throw new Error(error.message || 'Error al obtener inventario')
    }
  }

  /**
   * Adjust inventory (add, remove, or set specific quantity)
   */
  async adjustInventory(adjustment: InventoryAdjustment): Promise<InventoryItem> {
    try {
      // Get business context
      const { businessId } = await getBusinessContext()

      // Get or create inventory record
      let inventory = await this.getInventoryByProduct(
        adjustment.productId,
        adjustment.locationId,
        adjustment.variantId
      )

      let newQuantity: number

      if (adjustment.movementType === 'entry') {
        newQuantity = (inventory?.quantity || 0) + adjustment.quantity
      } else if (adjustment.movementType === 'exit') {
        newQuantity = (inventory?.quantity || 0) - adjustment.quantity
        if (newQuantity < 0) {
          throw new Error('Stock insuficiente para realizar la salida')
        }
      } else { // adjustment
        newQuantity = adjustment.quantity
      }

      let updatedInventory: any

      if (inventory) {
        // Update existing inventory
        const { data, error } = await supabase
          .from('inventory')
          .update({
            quantity: newQuantity,
            last_restocked: adjustment.movementType === 'entry' ? new Date().toISOString() : inventory.lastRestocked
          })
          .eq('id', inventory.id)
          .select()
          .single()

        if (error) throw error
        updatedInventory = data
      } else {
        // Create new inventory record
        const { data, error } = await supabase
          .from('inventory')
          .insert({
            business_id: businessId,
            product_id: adjustment.productId,
            variant_id: adjustment.variantId,
            location_id: adjustment.locationId,
            quantity: newQuantity,
            min_stock_level: 0,
            reorder_point: 0,
            last_restocked: adjustment.movementType === 'entry' ? new Date().toISOString() : null
          })
          .select()
          .single()

        if (error) throw error
        updatedInventory = data
      }

      // Record the movement
      await this.createInventoryMovement({
        inventoryId: updatedInventory.id,
        movementType: adjustment.movementType,
        quantity: adjustment.quantity,
        notes: adjustment.notes
      })

      return {
        id: updatedInventory.id,
        productId: updatedInventory.product_id,
        variantId: updatedInventory.variant_id,
        locationId: updatedInventory.location_id,
        quantity: updatedInventory.quantity,
        minStockLevel: updatedInventory.min_stock_level,
        reorderPoint: updatedInventory.reorder_point,
        lastRestocked: updatedInventory.last_restocked ? new Date(updatedInventory.last_restocked) : undefined
      }
    } catch (error: any) {
      console.error('Error adjusting inventory:', error)
      throw new Error(error.message || 'Error al ajustar inventario')
    }
  }

  /**
   * Transfer inventory between locations
   */
  async transferInventory(transfer: InventoryTransfer): Promise<void> {
    try {
      if (transfer.fromLocationId === transfer.toLocationId) {
        throw new Error('La ubicación de origen y destino no pueden ser la misma')
      }

      if (transfer.quantity <= 0) {
        throw new Error('La cantidad a transferir debe ser mayor a 0')
      }

      // Remove from source location
      await this.adjustInventory({
        productId: transfer.productId,
        variantId: transfer.variantId,
        locationId: transfer.fromLocationId,
        quantity: transfer.quantity,
        movementType: 'exit',
        notes: `Transferencia a ubicación ${transfer.toLocationId}. ${transfer.notes || ''}`
      })

      // Add to destination location
      await this.adjustInventory({
        productId: transfer.productId,
        variantId: transfer.variantId,
        locationId: transfer.toLocationId,
        quantity: transfer.quantity,
        movementType: 'entry',
        notes: `Transferencia desde ubicación ${transfer.fromLocationId}. ${transfer.notes || ''}`
      })
    } catch (error: any) {
      console.error('Error transferring inventory:', error)
      throw new Error(error.message || 'Error al transferir inventario')
    }
  }

  /**
   * Create an inventory movement record
   */
  private async createInventoryMovement(movement: {
    inventoryId: number
    movementType: 'entry' | 'exit' | 'adjustment' | 'transfer'
    quantity: number
    referenceType?: string
    referenceId?: number
    notes?: string
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          inventory_id: movement.inventoryId,
          movement_type: movement.movementType,
          quantity: movement.quantity,
          reference_type: movement.referenceType,
          reference_id: movement.referenceId,
          notes: movement.notes,
          created_by: (await supabase.auth.getUser()).data.user?.id || 'system'
        })

      if (error) throw error
    } catch (error: any) {
      console.error('Error creating inventory movement:', error)
      // Don't throw error, just log it - movement tracking is not critical
    }
  }

  /**
   * Get inventory movements for a specific inventory item
   */
  async getInventoryMovements(inventoryId: number): Promise<InventoryMovement[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('inventory_id', inventoryId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(item => ({
        id: item.id,
        inventoryId: item.inventory_id,
        movementType: item.movement_type,
        quantity: item.quantity,
        referenceType: item.reference_type,
        referenceId: item.reference_id,
        notes: item.notes,
        createdBy: item.created_by,
        createdAt: new Date(item.created_at)
      }))
    } catch (error: any) {
      console.error('Error getting inventory movements:', error)
      throw new Error(error.message || 'Error al obtener movimientos')
    }
  }

  /**
   * Update stock levels (min stock and reorder point)
   */
  async updateStockLevels(
    inventoryId: number,
    minStockLevel: number,
    reorderPoint: number
  ): Promise<InventoryItem> {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .update({
          min_stock_level: minStockLevel,
          reorder_point: reorderPoint
        })
        .eq('id', inventoryId)
        .select()
        .single()

      if (error) throw error

      return {
        id: data.id,
        productId: data.product_id,
        variantId: data.variant_id,
        locationId: data.location_id,
        quantity: data.quantity,
        minStockLevel: data.min_stock_level,
        reorderPoint: data.reorder_point,
        lastRestocked: data.last_restocked ? new Date(data.last_restocked) : undefined
      }
    } catch (error: any) {
      console.error('Error updating stock levels:', error)
      throw new Error(error.message || 'Error al actualizar niveles de stock')
    }
  }

  /**
   * Get low stock alerts (products below reorder point)
   */
  async getLowStockAlerts(locationId?: number): Promise<InventoryWithProduct[]> {
    return this.getInventory({ locationId, lowStock: true })
  }

  /**
   * Check if there's enough stock for a sale
   */
  async checkStockAvailability(
    productId: number,
    locationId: number,
    quantity: number,
    variantId?: number
  ): Promise<boolean> {
    try {
      const inventory = await this.getInventoryByProduct(productId, locationId, variantId)
      return inventory ? inventory.quantity >= quantity : false
    } catch (error) {
      return false
    }
  }
}

export const inventoryService = new InventoryService()
