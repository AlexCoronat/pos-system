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
  locationId: number
  quantity: number
  movementType: 'entry' | 'exit' | 'adjustment'
  notes?: string
}

export interface InventoryTransfer {
  productId: number
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
        quantity: item.quantity_available || item.quantity || 0,
        minStockLevel: item.min_stock_level,
        reorderPoint: item.reorder_point,
        lastRestocked: item.last_restock_date ? new Date(item.last_restock_date) : undefined,
        productName: item.product.name,
        productSku: item.product.sku,
        variantName: undefined
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
    locationId: number
  ): Promise<InventoryItem | null> {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_id', productId)
        .eq('location_id', locationId)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        return null
      }

      return {
        id: data.id,
        productId: data.product_id,
        variantId: undefined,
        locationId: data.location_id,
        quantity: data.quantity_available || data.quantity || 0,
        minStockLevel: data.min_stock_level,
        reorderPoint: data.reorder_point,
        lastRestocked: data.last_restock_date ? new Date(data.last_restock_date) : undefined
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
        adjustment.locationId
      )

      const quantityBefore = inventory?.quantity || 0
      let newQuantity: number

      if (adjustment.movementType === 'entry') {
        newQuantity = quantityBefore + adjustment.quantity
      } else if (adjustment.movementType === 'exit') {
        newQuantity = quantityBefore - adjustment.quantity
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
            quantity_available: newQuantity,
            last_restock_date: adjustment.movementType === 'entry' ? new Date().toISOString() : inventory.lastRestocked
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
            location_id: adjustment.locationId,
            quantity_available: newQuantity,
            min_stock_level: 0,
            reorder_point: 0,
            last_restock_date: adjustment.movementType === 'entry' ? new Date().toISOString() : null
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
        quantityBefore: quantityBefore,
        quantityAfter: newQuantity,
        notes: adjustment.notes
      })

      return {
        id: updatedInventory.id,
        productId: updatedInventory.product_id,
        variantId: undefined,
        locationId: updatedInventory.location_id,
        quantity: updatedInventory.quantity_available || updatedInventory.quantity || 0,
        minStockLevel: updatedInventory.min_stock_level,
        reorderPoint: updatedInventory.reorder_point,
        lastRestocked: updatedInventory.last_restock_date ? new Date(updatedInventory.last_restock_date) : undefined
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
        locationId: transfer.fromLocationId,
        quantity: transfer.quantity,
        movementType: 'exit',
        notes: `Transferencia a ubicación ${transfer.toLocationId}. ${transfer.notes || ''}`
      })

      // Add to destination location
      await this.adjustInventory({
        productId: transfer.productId,
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
    quantityBefore: number
    quantityAfter: number
    referenceType?: string
    referenceId?: number
    notes?: string
  }): Promise<void> {
    try {
      const { businessId } = await getBusinessContext()

      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          business_id: businessId,
          inventory_id: movement.inventoryId,
          movement_type: movement.movementType,
          quantity: movement.quantity,
          quantity_before: movement.quantityBefore,
          quantity_after: movement.quantityAfter,
          reference_type: movement.referenceType,
          reference_id: movement.referenceId,
          notes: movement.notes,
          performed_by: (await supabase.auth.getUser()).data.user?.id
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
        createdBy: item.performed_by,
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
        variantId: undefined,
        locationId: data.location_id,
        quantity: data.quantity_available || data.quantity || 0,
        minStockLevel: data.min_stock_level,
        reorderPoint: data.reorder_point,
        lastRestocked: data.last_restock_date ? new Date(data.last_restock_date) : undefined
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
    quantity: number
  ): Promise<boolean> {
    try {
      const inventory = await this.getInventoryByProduct(productId, locationId)
      return inventory ? inventory.quantity >= quantity : false
    } catch (error) {
      return false
    }
  }
}

export const inventoryService = new InventoryService()
