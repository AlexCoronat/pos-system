/**
 * Types for Customers Module
 */

export type CustomerType = 'individual' | 'business'

export interface Customer {
  id: number
  customerNumber?: string
  type?: CustomerType
  firstName?: string
  lastName?: string
  businessName?: string
  taxId?: string
  email?: string
  phone?: string
  mobile?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  birthDate?: Date
  creditLimit?: number
  currentBalance?: number
  loyaltyPoints?: number
  preferredLocationId?: number
  isActive: boolean
  notes?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface CustomerListItem {
  id: number
  customerNumber?: string
  type?: CustomerType
  firstName?: string
  lastName?: string
  businessName?: string
  email?: string
  phone?: string
  mobile?: string
  city?: string
  creditLimit?: number
  currentBalance?: number
  loyaltyPoints?: number
  isActive: boolean
  createdAt: Date
}

export interface CreateCustomerData {
  customerNumber?: string
  type?: CustomerType
  firstName?: string
  lastName?: string
  businessName?: string
  taxId?: string
  email?: string
  phone?: string
  mobile?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  birthDate?: string
  creditLimit?: number
  preferredLocationId?: number
  isActive?: boolean
  notes?: string
  metadata?: Record<string, any>
}

export interface UpdateCustomerData {
  customerNumber?: string
  type?: CustomerType
  firstName?: string
  lastName?: string
  businessName?: string
  taxId?: string
  email?: string
  phone?: string
  mobile?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  birthDate?: string
  creditLimit?: number
  preferredLocationId?: number
  isActive?: boolean
  notes?: string
  metadata?: Record<string, any>
}

export interface CustomerFilters {
  searchTerm?: string
  type?: CustomerType
  isActive?: boolean
  city?: string
  hasCredit?: boolean
}

export interface CustomersListResponse {
  customers: CustomerListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CustomerPurchaseHistory {
  saleId: number
  saleNumber: string
  date: Date
  total: number
  itemCount: number
  status: string
}

export interface CustomerStats {
  totalPurchases: number
  totalSpent: number
  averageTicket: number
  lastPurchaseDate?: Date
  loyaltyPoints: number
}
