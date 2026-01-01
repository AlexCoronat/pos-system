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
import { isInternalEmail, extractUsernameFromEmail } from '../utils/password-utils'
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

      // Listen to auth changes
      this.supabase.auth.onAuthStateChange(async (event: any, session: any) => {

        // IMPORTANT: Don't load profile here for SIGNED_IN
        // The login/register methods handle loading the profile
        // We only handle SIGNED_OUT to clean up state
        if (event === 'SIGNED_OUT') {
          await this.handleSignOut()
        }
      })

      // Check for existing session (on page load/refresh)
      const { data: { session } } = await this.supabase.auth.getSession()
      if (session?.user) {
        try {
          await this.loadUserProfile(session.user.id)
        } catch (profileError: any) {
          // If user profile doesn't exist (orphaned session), sign out
          if (profileError?.code === 'PGRST116') {
            logger.warn('User profile not found, signing out orphaned session', { userId: session.user.id })
            await this.supabase.auth.signOut()
            this.clearStorage()
          } else {
            throw profileError
          }
        }
      }

      this.initialized = true
    } catch (error) {
      logger.error('Error initializing auth', { error })
      this.handleAuthError(error as AuthError)
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Login with email or username and password
   */
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      this.setLoading(true)

      // Check if credentials.email is actually a username
      // If it doesn't contain @, assume it's a username
      let actualEmail = credentials.email

      if (!credentials.email.includes('@')) {
        // It's a username, lookup the actual email
        const { data: userDetails, error: lookupError } = await this.supabase
          .from('user_details')
          .select('email')
          .eq('username', credentials.email)
          .single()

        if (lookupError || !userDetails) {
          throw new AuthenticationError('Usuario o contraseña incorrectos')
        }

        actualEmail = userDetails.email
      }

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: actualEmail,
        password: credentials.password,
      })

      if (error) {
        console.error('Auth error:', error)
        throw error
      }
      if (!data.user) {
        console.error('No user returned from login')
        throw new AuthenticationError('No user returned from login')
      }

      // Load full user profile
      const user = await this.loadUserProfile(data.user.id)

      // Check if user needs to change password
      const { data: userDetails } = await this.supabase
        .from('user_details')
        .select('force_password_change')
        .eq('id', data.user.id)
        .single()

      if (userDetails?.force_password_change) {
        // Store user ID for password change page
        localStorage.setItem('pending_password_change_user_id', data.user.id)
        throw new AuthenticationError('FORCE_PASSWORD_CHANGE')
      }

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
      logger.error('Login failed', { error })
      console.error('=== LOGIN ERROR ===', error)
      throw this.handleAuthError(error as AuthError)
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Register new user with email and password
   * Creates a new business if businessName is provided
   */
  async register(data: RegisterData): Promise<AuthUser> {
    try {
      this.setLoading(true)

      // Step 1: Create user in auth.users with metadata
      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone || null,
            accepted_terms: data.acceptTerms
          }
        }
      })

      if (error) throw error
      if (!authData.user) throw new AuthenticationError('No user returned from registration')

      // Step 2: If business data provided, create business and location
      if (data.businessName) {
        await this.createBusinessForUser(authData.user.id, data)
      }

      // Load the complete user profile
      const user = await this.loadUserProfile(authData.user.id)

      return user
    } catch (error) {
      logger.error('Registration failed', { error })
      throw this.handleAuthError(error as AuthError)
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Create business, location and assign user as admin
   * @private
   */
  private async createBusinessForUser(userId: string, data: RegisterData): Promise<void> {
    try {
      // Get Admin role ID from roles (system role)
      const { data: adminRole } = await this.supabase
        .from('roles')
        .select('id')
        .eq('name', 'Admin')
        .is('business_id', null)
        .single()

      // Create business
      const { data: business, error: businessError } = await this.supabase
        .from('businesses')
        .insert({
          name: data.businessName,
          tax_id: data.businessTaxId || null,
          business_type: data.businessType || null,
          owner_id: userId,
          plan_id: 1, // Free plan by default
          is_active: true
        })
        .select()
        .single()

      if (businessError) throw businessError

      // IMPORTANT: Update user_details with business_id FIRST
      // This is needed before creating location due to RLS policies
      // that check get_user_business_id() which queries user_details
      const { error: updateError } = await this.supabase
        .from('user_details')
        .update({
          business_id: business.id,
          role_id: adminRole?.id || null
        })
        .eq('id', userId)

      if (updateError) throw updateError

      // Now create first location (RLS will now allow this because user has business_id)
      const { data: location, error: locationError } = await this.supabase
        .from('locations')
        .insert({
          business_id: business.id,
          code: `LOC-${business.id}-001`,
          name: data.locationName || 'Principal',
          address: data.locationAddress || null,
          city: data.locationCity || null,
          state: data.locationState || null,
          postal_code: data.locationPostalCode || null,
          phone: data.locationPhone || null,
          email: data.email || null, // Use registration email for main location
          main_location: 1, // Mark as main location
          is_active: true
        })
        .select()
        .single()

      if (locationError) throw locationError

      // Update user_details with default location
      const { error: locationUpdateError } = await this.supabase
        .from('user_details')
        .update({
          default_location_id: location.id
        })
        .eq('id', userId)

      if (locationUpdateError) throw locationUpdateError

      // Assign user to location
      const { error: assignError } = await this.supabase
        .from('user_locations')
        .insert({
          user_id: userId,
          location_id: location.id,
          is_primary: true
        })

      if (assignError) throw assignError

      logger.info('Business created for user', { userId, businessId: business.id })
    } catch (error) {
      logger.error('Failed to create business for user', { error, userId })
      throw error
    }
  }

  /**
   * Login with Google OAuth
   */
  async loginWithGoogle(): Promise<void> {
    try {

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

      // End session record
      await this.endUserSession()

      // Sign out from Supabase
      await this.supabase.auth.signOut()

      await this.handleSignOut()
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
  }

  /**
   * Change password on first login (forced password change)
   */
  async changePasswordFirstLogin(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> {
    if (newPassword !== confirmPassword) {
      throw new Error('Las contraseñas no coinciden')
    }

    // Validate password strength
    const { validatePasswordStrength } = await import('../utils/password-utils')
    const validation = validatePasswordStrength(newPassword)

    if (!validation.valid) {
      throw new Error(validation.errors.join(', '))
    }

    // Get pending user ID
    const userId = localStorage.getItem('pending_password_change_user_id')
    if (!userId) {
      throw new Error('No pending password change found')
    }

    // Update password via Supabase Auth
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw this.handleAuthError(error as AuthError)

    // Update user_details to clear force_password_change and update timestamp
    await this.supabase
      .from('user_details')
      .update({
        force_password_change: false,
        password_changed_at: new Date().toISOString(),
        temporary_password_hash: null // Clear temp password
      })
      .eq('id', userId)

    // Clear pending change flag
    localStorage.removeItem('pending_password_change_user_id')
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
        role:roles!role_id(id, name, permissions, is_system),
        business:businesses!business_id(
          id,
          name,
          owner_id,
          plan_id,
          plan:subscription_plans!plan_id(
            id,
            name,
            description,
            price,
            currency,
            billing_period,
            max_users,
            max_locations,
            max_products,
            features,
            whatsapp_enabled,
            monthly_quote_limit
          )
        ),
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

    if (error) {
      console.error('Error loading user profile:', error)
      throw this.handleAuthError(error as AuthError)
    }
    if (!data) {
      console.error('No user data returned for userId:', userId)
      throw new AuthenticationError('User not found')
    }

    // Type assertion for data since we're using custom schemas
    const userData = data as any

    // Get permissions from role
    const permissions = this.parsePermissions(userData.role?.permissions)

    // Transform plan data if exists
    const planData = userData.business?.plan
    const plan = planData ? {
      id: planData.id,
      name: planData.name,
      description: planData.description || undefined,
      price: parseFloat(planData.price) || 0,
      currency: planData.currency || 'MXN',
      billingPeriod: planData.billing_period || 'monthly',
      maxUsers: planData.max_users || 1,
      maxLocations: planData.max_locations || 1,
      maxProducts: planData.max_products || 50,
      features: planData.features || [],
      whatsappEnabled: planData.whatsapp_enabled || false,
      monthlyQuoteLimit: planData.monthly_quote_limit || 0
    } : undefined

    // Transform to AuthUser format
    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      phone: userData.phone || undefined,
      roleId: userData.role_id || null,
      roleName: userData.role?.name || 'Sin rol',
      isSystemRole: userData.role?.is_system ?? false,
      permissions: permissions,
      // Business info
      businessId: userData.business_id || undefined,
      businessName: userData.business?.name || undefined,
      planId: userData.business?.plan_id || undefined,
      planName: userData.business?.plan?.name || undefined,
      plan: plan,
      isBusinessOwner: userData.business?.owner_id === userId,
      // Location info
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
        .eq('id', sessionId)
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
