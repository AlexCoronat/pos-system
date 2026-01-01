
// Authentication types adapted from the Angular service
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  acceptTerms: boolean
  // Business data (for new business registration)
  businessName?: string
  businessTaxId?: string
  businessType?: string
  // First location data
  locationName?: string
  locationAddress?: string
  locationCity?: string
  locationState?: string
  locationPostalCode?: string
  locationPhone?: string
}

export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  phone?: string
  avatarUrl?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Assigned location interface
export interface AssignedLocation {
  id: number
  locationId: number
  isPrimary: boolean
  location: {
    id: number
    name: string
    code: string
    city?: string
    state?: string
  }
}

// Subscription plan details
export interface SubscriptionPlan {
  id: number
  name: string
  description?: string
  price: number
  currency: string
  billingPeriod: string
  maxUsers: number
  maxLocations: number
  maxProducts: number
  features: string[]
  whatsappEnabled: boolean
  monthlyQuoteLimit: number
}

// Main user interface matching the Angular service
export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  roleId: number | null
  roleName: string
  isSystemRole: boolean
  permissions: Record<string, string[]>
  // Business info
  businessId?: number
  businessName?: string
  planId?: number
  planName?: string
  plan?: SubscriptionPlan
  isBusinessOwner?: boolean
  // Location info
  defaultLocationId?: number
  locationName?: string
  isActive: boolean
  lastLoginAt?: Date
  emailVerified: boolean
  avatarUrl?: string
  metadata?: Record<string, any>
  assignedLocations: AssignedLocation[]
}

// Authentication state
export interface AuthState {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
}

// Session configuration
export interface SessionConfig {
  locationId?: number
  ipAddress?: string
  userAgent?: string
}

// Permission and role helpers
export type PermissionAction = 'read' | 'create' | 'update' | 'delete'
export type PermissionModule = 'sales' | 'inventory' | 'customers' | 'reports' | 'settings' | 'users' | 'locations'

// Error types
export interface AuthError {
  code: string
  message: string
  details?: any
}

// Storage keys (matching Angular service)
export const STORAGE_KEYS = {
  USER_DATA: 'pos_user_data',
  SELECTED_LOCATION: 'pos_selected_location',
  SESSION_ID: 'pos_session_id',
  REMEMBER_ME: 'pos_remember_me'
} as const

// Default role permissions
export const DEFAULT_PERMISSIONS: Record<string, Record<string, string[]>> = {
  'Admin': {
    'sales': ['read', 'create', 'update', 'delete'],
    'inventory': ['read', 'create', 'update', 'delete'],
    'customers': ['read', 'create', 'update', 'delete'],
    'reports': ['read'],
    'settings': ['read', 'update'],
    'users': ['read', 'create', 'update', 'delete'],
    'locations': ['read', 'create', 'update', 'delete']
  },
  'Manager': {
    'sales': ['read', 'create', 'update', 'delete'],
    'inventory': ['read', 'create', 'update'],
    'customers': ['read', 'create', 'update'],
    'reports': ['read'],
    'settings': ['read']
  },
  'Seller': {
    'sales': ['read', 'create', 'update'],
    'customers': ['read', 'create', 'update'],
    'inventory': ['read']
  },
  'Support': {
    'customers': ['read', 'update'],
    'inventory': ['read'],
    'reports': ['read']
  },
  'Inventory Manager': {
    'inventory': ['read', 'create', 'update', 'delete'],
    'sales': ['read'],
    'reports': ['read']
  }
}
