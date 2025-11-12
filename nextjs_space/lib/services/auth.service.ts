/**
 * Authentication Service (Optimized)
 * Handles all authentication-related operations with improved error handling and best practices
 */

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
import { STORAGE_KEYS, DEFAULT_PERMISSIONS, AUTH_CONSTANTS } from '../constants/auth'
import { ROUTES } from '../constants/routes'
import { parseAuthError, logError, AuthenticationError } from '../utils/error-handler'
import { logger } from '../utils/logger'
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

  /**
   * Initialize authentication state
   */
  async initializeAuth(): Promise<void> {
    if (this.initialized) return

    try {
      this.setLoading(true)
      logger.info('Initializing authentication')

      // Listen to auth changes
      this.supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        logger.debug('Auth state changed', { event })

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
      logger.info('Authentication initialized successfully')
    } catch (error) {
      logger.error('Error initializing auth', { error })
      this.handleAuthError(error as AuthError)
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      this.setLoading(true)
      logger.info('Attempting login', { email: credentials.email })

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) throw error
      if (!data.user) throw new AuthenticationError('No user returned from login')

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

      logger.info('Login successful', { userId: user.id })
      return user
    } catch (error) {
      logger.error('Login failed', { error })
      throw this.handleAuthError(error as AuthError)
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Register new user with email and password
   */
  async register(data: RegisterData): Promise<AuthUser> {
    try {
      this.setLoading(true)
      logger.info('Attempting registration', { email: data.email })

      // Step 1: Create user in auth.users (trigger will auto-create user_details)
      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (error) throw error
      if (!authData.user) throw new AuthenticationError('No user returned from registration')

      // Step 2: Update user_details with additional info
      // The trigger already created the basic record, now we add first_name, last_name, phone
      const { error: updateError } = await this.supabase
        .from('user_details')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone || null,
          metadata: { acceptedTerms: data.acceptTerms }
        })
        .eq('id', authData.user.id)

      if (updateError) {
        logger.error('Error updating user details', { error: updateError })
        // Don't throw, the user is already created in auth.users
      }

      // Load the complete user profile
      const user = await this.loadUserProfile(authData.user.id)

      logger.info('Registration successful', { userId: user.id })
      return user
    } catch (error) {
      logger.error('Registration failed', { error })
      throw this.handleAuthError(error as AuthError)
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Login with Google OAuth
   */
  async loginWithGoogle(): Promise<void> {
    try {
      logger.info('Initiating Google OAuth login')

      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: AUTH_CONSTANTS.OAUTH_PROVIDERS.GOOGLE,
        options: {
          redirectTo: `${window.location.origin}${ROUTES.AUTH.CALLBACK}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) throw error
    } catch (error) {
      logger.error('Google OAuth login failed', { error })
      throw this.handleAuthError(error as AuthError)
    }
  }

  /**
   * Check if user profile is complete (for OAuth users)
   */
  async isProfileComplete(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('user_details')
        .select('first_name, last_name')
        .eq('id', userId)
        .single()

      if (error) throw error

      // Profile is complete if both first_name and last_name exist
      return !!(data?.first_name && data?.last_name)
    } catch (error) {
      logger.error('Error checking profile completeness', { error, userId })
      return false
    }
  }

  /**
   * Complete OAuth user profile
   */
  async completeOAuthProfile(userId: string, data: { firstName: string; lastName: string; phone?: string }): Promise<AuthUser> {
    try {
      this.setLoading(true)
      logger.info('Completing OAuth profile', { userId })

      const { error } = await this.supabase
        .from('user_details')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      // Load the complete user profile
      return await this.loadUserProfile(userId)
    } catch (error) {
      logger.error('Failed to complete OAuth profile', { error, userId })
      throw this.handleAuthError(error as AuthError)
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Handle OAuth callback - ensure user profile exists
   */
  async handleOAuthCallback(userId: string, email: string): Promise<{ needsProfileCompletion: boolean; user?: AuthUser }> {
    try {
      logger.info('Handling OAuth callback', { userId, email })

      // Check if user profile exists in user_details
      // Note: The trigger should have already created it when the user logged in via OAuth
      const { data: existingUser, error: fetchError } = await this.supabase
        .from('user_details')
        .select('*')
        .eq('id', userId)
        .single()

      // If user doesn't exist in user_details (shouldn't happen with trigger, but just in case)
      if (fetchError || !existingUser) {
        logger.warn('User details not found after OAuth, trigger may have failed', { userId })

        // Manually create the profile as fallback
        const { error: insertError } = await this.supabase
          .from('user_details')
          .insert({
            id: userId,
            email: email,
            role_id: AUTH_CONSTANTS.ROLES.SELLER,
            is_active: true,
            email_verified: true, // OAuth users are considered verified
            metadata: { oauth_provider: AUTH_CONSTANTS.OAUTH_PROVIDERS.GOOGLE }
          })

        if (insertError) throw insertError

        // Profile needs to be completed
        return { needsProfileCompletion: true }
      }

      // Check if profile is complete (has first_name and last_name)
      const isComplete = await this.isProfileComplete(userId)

      if (!isComplete) {
        return { needsProfileCompletion: true }
      }

      // Load full profile
      const user = await this.loadUserProfile(userId)
      return { needsProfileCompletion: false, user }
    } catch (error) {
      logger.error('OAuth callback failed', { error, userId })
      throw this.handleAuthError(error as AuthError)
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      this.setLoading(true)
      logger.info('Logging out user')

      // End session record
      await this.endUserSession()

      // Sign out from Supabase
      await this.supabase.auth.signOut()

      await this.handleSignOut()
      logger.info('Logout successful')
    } catch (error) {
      logger.error('Error during logout', { error })
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${ROUTES.AUTH.RESET_PASSWORD}`
    })

    if (error) throw this.handleAuthError(error as AuthError)
    logger.info('Password reset email sent', { email })
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    if (data.newPassword !== data.confirmPassword) {
      throw new Error('New passwords do not match')
    }

    const { error } = await this.supabase.auth.updateUser({
      password: data.newPassword
    })

    if (error) throw this.handleAuthError(error as AuthError)
    logger.info('Password changed successfully')
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<AuthUser> {
    if (!this.currentUser) throw new AuthenticationError('No authenticated user')

    const { error } = await this.supabase
      .from('user_details')
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
    logger.info('Profile updated successfully', { userId: this.currentUser.id })
    return await this.loadUserProfile(this.currentUser.id)
  }

  /**
   * Load user profile with relations
   * @private
   */
  private async loadUserProfile(userId: string): Promise<AuthUser> {
    const { data, error } = await this.supabase
      .from('user_details')
      .select(`
        *,
        role:roles!role_id(*),
        defaultLocation:locations!default_location_id(*),
        userLocations:user_locations!user_locations_user_id_fkey(
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
    if (!data) throw new AuthenticationError('User not found')

    // Type assertion for data since we're using custom schemas
    const userData = data as any

    // Transform to AuthUser format
    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      phone: userData.phone || undefined,
      roleId: userData.role_id || AUTH_CONSTANTS.ROLES.SELLER,
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
      .from('user_details')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId)

    this.currentUser = user
    this.saveUserToStorage(user)
    this.notifyListeners()

    return user
  }

  /**
   * Permission helpers
   */
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

  /**
   * Session management
   */
  async createUserSession(config: SessionConfig = {}): Promise<void> {
    if (!this.currentUser) return

    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
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
      logger.error('Error creating session', { error })
    }
  }

  async endUserSession(): Promise<void> {
    const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID)
    if (!sessionId) return

    try {
      await this.supabase
        .from('user_sessions')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', parseInt(sessionId))
    } catch (error) {
      logger.error('Error ending session', { error })
    }
  }

  /**
   * Getters
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser
  }

  isAuthenticated(): boolean {
    return !!this.currentUser
  }

  isLoading(): boolean {
    return this.loading
  }

  /**
   * State management
   */
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

  /**
   * Private helper methods
   */
  private parsePermissions(permissions: any): Record<string, string[]> {
    if (!permissions) return DEFAULT_PERMISSIONS['Seller'] || {}

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
    const authError = parseAuthError(error)
    logError(authError, 'AuthService')
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
