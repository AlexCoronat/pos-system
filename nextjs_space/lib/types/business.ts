/**
 * Types for Business/Multi-tenant Module
 */

export interface SubscriptionPlan {
  id: number
  name: string
  description?: string
  price: number
  currency: string
  billingPeriod: 'monthly' | 'yearly'
  maxUsers: number
  maxLocations: number
  maxProducts: number
  features: string[]
  isActive: boolean
}

export interface Business {
  id: number
  name: string
  legalName?: string
  taxId?: string
  ownerId: string
  planId: number
  businessType?: string
  logoUrl?: string
  website?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country: string
  timezone: string
  currency: string
  isActive: boolean
  trialEndsAt?: Date
  subscriptionStartsAt?: Date
  subscriptionEndsAt?: Date
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  // Relations
  plan?: SubscriptionPlan
}

export interface CreateBusinessData {
  name: string
  legalName?: string
  taxId?: string
  businessType?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

export interface UpdateBusinessData {
  name?: string
  legalName?: string
  taxId?: string
  businessType?: string
  logoUrl?: string
  website?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  timezone?: string
  currency?: string
}

export interface BusinessStats {
  totalUsers: number
  totalLocations: number
  totalProducts: number
  totalCustomers: number
  totalSales: number
  // Plan limits
  maxUsers: number
  maxLocations: number
  maxProducts: number
}

export interface BusinessRegistrationData {
  // User data
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  // Business data
  businessName: string
  taxId?: string
  businessType?: string
  // First location data
  locationName: string
  locationAddress?: string
  locationCity?: string
  locationState?: string
  locationPostalCode?: string
  locationPhone?: string
}

// Plan feature flags
export interface PlanFeatures {
  hasAdvancedReports: boolean
  hasApiAccess: boolean
  hasMultipleLocations: boolean
  hasCustomRoles: boolean
  hasPrioritySupport: boolean
  hasWhiteLabel: boolean
}

export type PlanName = 'free' | 'starter' | 'professional' | 'enterprise'
