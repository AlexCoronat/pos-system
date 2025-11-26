/**
 * Cart Store - Zustand
 * Manages shopping cart state for sales
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Cart } from '../types/sales'

interface CartStore extends Cart {
  // Actions
  addItem: (item: Omit<CartItem, 'total' | 'taxAmount' | 'discountAmount'>) => void
  removeItem: (productId: number, variantId?: number) => void
  updateItemQuantity: (productId: number, quantity: number, variantId?: number) => void
  updateItemDiscount: (productId: number, discount: number, variantId?: number, isPercentage?: boolean) => void
  setCustomer: (customerId: number, customerName: string) => void
  removeCustomer: () => void
  clearCart: () => void
  calculateTotals: () => void
}

const DEFAULT_TAX_PERCENTAGE = 16 // 16% IVA in Mexico

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      customerId: undefined,
      customerName: undefined,
      subtotal: 0,
      totalDiscount: 0,
      totalTax: 0,
      total: 0,

      // Add item to cart
      addItem: (item) => {
        const items = get().items

        // Check if product already exists in cart
        const existingItemIndex = items.findIndex(
          i => i.productId === item.productId && i.variantId === item.variantId
        )

        let newItems: CartItem[]

        if (existingItemIndex >= 0) {
          // Update quantity if item exists
          newItems = [...items]
          const existingItem = newItems[existingItemIndex]
          const newQuantity = existingItem.quantity + item.quantity

          // Check stock availability
          if (newQuantity > item.availableStock) {
            throw new Error(`Stock insuficiente. Disponible: ${item.availableStock}`)
          }

          // El precio de venta (unitPrice) ya incluye el impuesto
          // Necesitamos extraer el impuesto del precio de venta
          const priceWithTax = existingItem.unitPrice * newQuantity
          const priceWithoutTax = priceWithTax / (1 + DEFAULT_TAX_PERCENTAGE / 100)
          const taxAmount = priceWithTax - priceWithoutTax

          newItems[existingItemIndex] = {
            ...existingItem,
            quantity: newQuantity,
            discountAmount: 0,
            discountPercentage: 0,
            taxPercentage: DEFAULT_TAX_PERCENTAGE,
            taxAmount,
            total: priceWithTax
          }
        } else {
          // Add new item
          if (item.quantity > item.availableStock) {
            throw new Error(`Stock insuficiente. Disponible: ${item.availableStock}`)
          }

          // El precio de venta (unitPrice) ya incluye el impuesto
          // Necesitamos extraer el impuesto del precio de venta
          const priceWithTax = item.unitPrice * item.quantity
          const priceWithoutTax = priceWithTax / (1 + DEFAULT_TAX_PERCENTAGE / 100)
          const taxAmount = priceWithTax - priceWithoutTax
          const total = priceWithTax

          newItems = [
            ...items,
            {
              ...item,
              discountAmount: 0,
              discountPercentage: 0,
              taxPercentage: DEFAULT_TAX_PERCENTAGE,
              taxAmount,
              total
            }
          ]
        }

        set({ items: newItems })
        get().calculateTotals()
      },

      // Remove item from cart
      removeItem: (productId, variantId) => {
        const items = get().items.filter(
          item => !(item.productId === productId && item.variantId === variantId)
        )
        set({ items })
        get().calculateTotals()
      },

      // Update item quantity
      updateItemQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }

        const items = get().items.map(item => {
          if (item.productId === productId && item.variantId === variantId) {
            // Check stock availability
            if (quantity > item.availableStock) {
              throw new Error(`Stock insuficiente. Disponible: ${item.availableStock}`)
            }

            // El precio unitario ya incluye impuesto
            const priceWithTax = item.unitPrice * quantity
            const priceWithoutTax = priceWithTax / (1 + item.taxPercentage / 100)

            // Calcular descuento sobre el precio SIN impuesto
            const discountAmount = item.discountPercentage > 0
              ? (priceWithoutTax * item.discountPercentage) / 100
              : item.discountAmount

            const priceAfterDiscount = priceWithoutTax - discountAmount
            const taxAmount = priceAfterDiscount * (item.taxPercentage / 100)
            const total = priceAfterDiscount + taxAmount

            return {
              ...item,
              quantity,
              discountAmount,
              taxAmount,
              total
            }
          }
          return item
        })

        set({ items })
        get().calculateTotals()
      },

      // Update item discount
      updateItemDiscount: (productId, discount, variantId, isPercentage = false) => {
        const items = get().items.map(item => {
          if (item.productId === productId && item.variantId === variantId) {
            // El precio unitario ya incluye impuesto
            const priceWithTax = item.unitPrice * item.quantity
            const priceWithoutTax = priceWithTax / (1 + item.taxPercentage / 100)

            let discountAmount = 0
            let discountPercentage = 0

            if (isPercentage) {
              discountPercentage = Math.min(100, Math.max(0, discount))
              // El descuento se aplica sobre el precio SIN impuesto
              discountAmount = (priceWithoutTax * discountPercentage) / 100
            } else {
              discountAmount = Math.min(priceWithoutTax, Math.max(0, discount))
              discountPercentage = (discountAmount / priceWithoutTax) * 100
            }

            const priceAfterDiscount = priceWithoutTax - discountAmount
            const taxAmount = priceAfterDiscount * (item.taxPercentage / 100)
            const total = priceAfterDiscount + taxAmount

            return {
              ...item,
              discountAmount,
              discountPercentage,
              taxAmount,
              total
            }
          }
          return item
        })

        set({ items })
        get().calculateTotals()
      },

      // Set customer
      setCustomer: (customerId, customerName) => {
        set({ customerId, customerName })
      },

      // Remove customer
      removeCustomer: () => {
        set({ customerId: undefined, customerName: undefined })
      },

      // Clear cart
      clearCart: () => {
        set({
          items: [],
          customerId: undefined,
          customerName: undefined,
          subtotal: 0,
          totalDiscount: 0,
          totalTax: 0,
          total: 0
        })
      },

      // Calculate totals
      calculateTotals: () => {
        const items = get().items

        // Subtotal debe ser el precio SIN impuesto (antes de descuentos)
        const subtotal = items.reduce((sum, item) => {
          const priceWithTax = item.unitPrice * item.quantity
          const priceWithoutTax = priceWithTax / (1 + item.taxPercentage / 100)
          return sum + priceWithoutTax
        }, 0)

        const totalDiscount = items.reduce((sum, item) => {
          return sum + item.discountAmount
        }, 0)

        const totalTax = items.reduce((sum, item) => {
          return sum + item.taxAmount
        }, 0)

        // Total = Subtotal - Descuentos + Impuestos
        const total = subtotal - totalDiscount + totalTax

        set({
          subtotal,
          totalDiscount,
          totalTax,
          total
        })
      }
    }),
    {
      name: 'pos-cart-storage', // LocalStorage key
      partialize: (state) => ({
        items: state.items,
        customerId: state.customerId,
        customerName: state.customerName
      })
    }
  )
)
