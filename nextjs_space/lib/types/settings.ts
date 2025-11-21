/**
 * Types for Settings Module
 */

export interface Location {
  id: number
  name: string
  code?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
  email?: string
  isActive: boolean
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface LocationListItem {
  id: number
  name: string
  code?: string
  city?: string
  state?: string
  phone?: string
  isActive: boolean
  userCount?: number
  createdAt: Date
}

export interface CreateLocationData {
  name: string
  code?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
  email?: string
  isActive?: boolean
  metadata?: Record<string, any>
}

export interface UpdateLocationData {
  name?: string
  code?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
  email?: string
  isActive?: boolean
  metadata?: Record<string, any>
}

export interface UserLocationBasic {
  id: number
  name: string
  code?: string
  city?: string
}

export interface UserLocation {
  id: number
  userId: string
  locationId: number
  isPrimary: boolean
  location?: UserLocationBasic
  createdAt: Date
}

export interface UserWithLocations {
  id: string
  email: string
  firstName: string
  lastName: string
  roleName: string
  isActive: boolean
  defaultLocationId?: number
  assignedLocations: UserLocation[]
}

export interface AssignUserLocationData {
  userId: string
  locationId: number
  isPrimary?: boolean
}

export interface SystemSettings {
  companyName?: string
  companyLogo?: string
  currency: string
  taxRate: number
  taxName: string
  timezone: string
  dateFormat: string
  language: string
}
