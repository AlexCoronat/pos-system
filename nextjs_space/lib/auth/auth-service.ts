
'use client'

import { createClient } from '../supabase/client'
import type { 
  AuthUser, 
  AuthState, 
  LoginCredentials, 
  RegisterData, 
  UpdateProfileData, 
  ChangePasswordData,
  SessionConfig,
  AuthError,
  AssignedLocation 
} from '../types/auth'
import { STORAGE_KEYS, DEFAULT_PERMISSIONS } from '../types/auth'
import type { User } from '@supabase/supabase-js'

class AuthService {
  private supabase: any = createClient()
  private currentUser: AuthUser | null = null
  private authListeners: ((state: AuthState) => void)[] = []
  private initialized = false
  private loading = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeAuth()
    }
  }

  // Initialize authentication state
  async initializeAuth(): Promise<void> {
    if (this.initialized) return
    
    try {
      this.setLoading(true)
      
      // Listen to auth changes
      this.supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await this.loadUserProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          await this.handleSignOut()
        }
      })

      // Check for existing session
      const { data: { session } } = await this.supabase.auth.getSession()
      if (session?.user) {
        await this.loadUserProfile(session.user.id)
      }

      this.initialized = true
    } catch (error) {
      console.error('Error initializing auth:', error)
      this.handleAuthError(error as AuthError)
    } finally {
      this.setLoading(false)
    }
  }

  // Login method
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      this.setLoading(true)

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) throw error
      if (!data.user) throw new Error('No user returned from login')

      // Load full user profile
      const user = await this.loadUserProfile(data.user.id)
      
      // Create session record
      await this.createUserSession({
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent
      })

      // Handle remember me
      if (credentials.rememberMe) {
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true')
      }

      return user
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    } finally {
      this.setLoading(false)
    }
  }

  // Register method
  async register(data: RegisterData): Promise<AuthUser> {
    try {
      this.setLoading(true)

      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (error) throw error
      if (!authData.user) throw new Error('No user returned from registration')

      // Create user profile in pos_core.users
      const { error: profileError } = await this.supabase
        .from('pos_core.users')
        .insert({
          id: authData.user.id,
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone || null,
          role_id: 3, // Default to 'Seller' role
          is_active: true,
          email_verified: false,
          metadata: { acceptedTerms: data.acceptTerms }
        })

      if (profileError) throw profileError

      // Load the complete user profile
      const user = await this.loadUserProfile(authData.user.id)
      
      return user
    } catch (error) {
      throw this.handleAuthError(error as AuthError)
    } finally {
      this.setLoading(false)
    }
  }

  // Logout method
  async logout(): Promise<void> {
    try {
      this.setLoading(true)
      
      // End session record
      await this.endUserSession()
      
      // Sign out from Supabase
      await this.supabase.auth.signOut()
      
      await this.handleSignOut()
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      this.setLoading(false)
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    
    if (error) throw this.handleAuthError(error as AuthError)
  }

  // Change password
  async changePassword(data: ChangePasswordData): Promise<void> {
    if (data.newPassword !== data.confirmPassword) {
      throw new Error('New passwords do not match')
    }

    const { error } = await this.supabase.auth.updateUser({
      password: data.newPassword
    })
    
    if (error) throw this.handleAuthError(error as AuthError)
  }

  // Update profile
  async updateProfile(data: UpdateProfileData): Promise<AuthUser> {
    if (!this.currentUser) throw new Error('No authenticated user')

    const { error } = await this.supabase
      .from('pos_core.users')
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        avatar_url: data.avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.currentUser.id)

    if (error) throw this.handleAuthError(error as AuthError)

    // Reload user profile
    return await this.loadUserProfile(this.currentUser.id)
  }

  // Load user profile with relations
  private async loadUserProfile(userId: string): Promise<AuthUser> {
    const { data, error } = await this.supabase
      .from('pos_core.users')
      .select(`
        *,
        role:roles!role_id(*),
        defaultLocation:locations!default_location_id(*),
        userLocations:user_locations(
          id,
          location_id,
          is_primary,
          location:locations!location_id(*)
        )
      `)
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (error) throw this.handleAuthError(error as AuthError)
    if (!data) throw new Error('User not found')

    // Type assertion for data since we're using custom schemas
    const userData = data as any

    // Transform to AuthUser format
    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      phone: userData.phone || undefined,
      roleId: userData.role_id || 3,
      roleName: userData.role?.name || 'Seller',
      permissions: this.parsePermissions(userData.role?.permissions),
      defaultLocationId: userData.default_location_id || undefined,
      locationName: userData.defaultLocation?.name || undefined,
      isActive: userData.is_active,
      lastLoginAt: userData.last_login_at ? new Date(userData.last_login_at) : undefined,
      emailVerified: userData.email_verified,
      avatarUrl: userData.avatar_url || undefined,
      metadata: userData.metadata as Record<string, any> || {},
      assignedLocations: this.transformLocations(userData.userLocations || [])
    }

    // Update login timestamp
    await this.supabase
      .from('pos_core.users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId)

    this.currentUser = user
    this.saveUserToStorage(user)
    this.notifyListeners()

    return user
  }

  // Permission helpers
  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false
    
    const [module, action] = permission.split(':')
    return this.currentUser.permissions[module]?.includes(action) || false
  }

  hasRole(...roles: string[]): boolean {
    if (!this.currentUser) return false
    return roles.includes(this.currentUser.roleName)
  }

  hasAnyPermission(...permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission))
  }

  // Session management
  async createUserSession(config: SessionConfig = {}): Promise<void> {
    if (!this.currentUser) return

    try {
      const { data, error } = await this.supabase
        .from('pos_core.user_sessions')
        .insert({
          user_id: this.currentUser.id,
          location_id: config.locationId || this.currentUser.defaultLocationId,
          ip_address: config.ipAddress,
          user_agent: config.userAgent,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error
      
      if (data?.id) {
        localStorage.setItem(STORAGE_KEYS.SESSION_ID, data.id.toString())
      }
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  async endUserSession(): Promise<void> {
    const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID)
    if (!sessionId) return

    try {
      await this.supabase
        .from('pos_core.user_sessions')
        .update({ 
          ended_at: new Date().toISOString(),
          is_active: false 
        })
        .eq('id', parseInt(sessionId))
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }

  // Getters
  getCurrentUser(): AuthUser | null {
    return this.currentUser
  }

  isAuthenticated(): boolean {
    return !!this.currentUser
  }

  isLoading(): boolean {
    return this.loading
  }

  // State management
  subscribe(callback: (state: AuthState) => void): () => void {
    this.authListeners.push(callback)
    
    // Immediately call with current state
    callback({
      user: this.currentUser,
      loading: this.loading,
      initialized: this.initialized
    })
    
    return () => {
      this.authListeners = this.authListeners.filter(listener => listener !== callback)
    }
  }

  // Private methods
  private parsePermissions(permissions: any): Record<string, string[]> {
    if (!permissions) return {}
    
    try {
      if (typeof permissions === 'string') {
        return JSON.parse(permissions)
      }
      return permissions as Record<string, string[]>
    } catch {
      // Fallback to default permissions based on role
      const roleName = this.currentUser?.roleName || 'Seller'
      return DEFAULT_PERMISSIONS[roleName] || DEFAULT_PERMISSIONS.Seller
    }
  }

  private transformLocations(locations: any[]): AssignedLocation[] {
    return locations.map(loc => ({
      id: loc.id,
      locationId: loc.location_id,
      isPrimary: loc.is_primary,
      location: {
        id: loc.location.id,
        name: loc.location.name,
        code: loc.location.code,
        city: loc.location.city,
        state: loc.location.state
      }
    }))
  }

  private async handleSignOut(): Promise<void> {
    this.currentUser = null
    this.clearStorage()
    this.notifyListeners()
  }

  private setLoading(loading: boolean): void {
    this.loading = loading
    this.notifyListeners()
  }

  private notifyListeners(): void {
    const state: AuthState = {
      user: this.currentUser,
      loading: this.loading,
      initialized: this.initialized
    }
    
    this.authListeners.forEach(listener => listener(state))
  }

  private saveUserToStorage(user: AuthUser): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user))
    }
  }

  private clearStorage(): void {
    if (typeof window !== 'undefined') {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
    }
  }

  private handleAuthError(error: any): AuthError {
    const authError: AuthError = {
      code: error.code || 'AUTH_ERROR',
      message: error.message || 'An authentication error occurred',
      details: error
    }
    
    console.error('Auth Error:', authError)
    return authError
  }

  private async getClientIP(): Promise<string | undefined> {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch {
      return undefined
    }
  }
}

// Export singleton instance
export const authService = new AuthService()
export default authService
