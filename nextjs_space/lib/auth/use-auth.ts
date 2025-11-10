
'use client'

import { useState, useEffect } from 'react'
import { authService } from './auth-service'
import type { AuthState, AuthUser, LoginCredentials, RegisterData, UpdateProfileData, ChangePasswordData } from '../types/auth'

// Main auth hook
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false
  })

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe(setAuthState)
    
    // Initialize auth if not already done
    if (!authState.initialized) {
      authService.initializeAuth()
    }

    return unsubscribe
  }, [])

  const login = async (credentials: LoginCredentials): Promise<AuthUser> => {
    return authService.login(credentials)
  }

  const register = async (data: RegisterData): Promise<AuthUser> => {
    return authService.register(data)
  }

  const logout = async (): Promise<void> => {
    return authService.logout()
  }

  const resetPassword = async (email: string): Promise<void> => {
    return authService.resetPassword(email)
  }

  const changePassword = async (data: ChangePasswordData): Promise<void> => {
    return authService.changePassword(data)
  }

  const updateProfile = async (data: UpdateProfileData): Promise<AuthUser> => {
    return authService.updateProfile(data)
  }

  const hasPermission = (permission: string): boolean => {
    return authService.hasPermission(permission)
  }

  const hasRole = (...roles: string[]): boolean => {
    return authService.hasRole(...roles)
  }

  const hasAnyPermission = (...permissions: string[]): boolean => {
    return authService.hasAnyPermission(...permissions)
  }

  return {
    ...authState,
    login,
    register,
    logout,
    resetPassword,
    changePassword,
    updateProfile,
    hasPermission,
    hasRole,
    hasAnyPermission,
    isAuthenticated: !!authState.user
  }
}

// Hook for protected routes
export function useRequireAuth() {
  const auth = useAuth()
  
  useEffect(() => {
    if (auth.initialized && !auth.loading && !auth.isAuthenticated) {
      window.location.href = '/auth/login'
    }
  }, [auth.initialized, auth.loading, auth.isAuthenticated])

  return auth
}

// Hook for permission-based access
export function usePermission(permission: string) {
  const auth = useAuth()
  return {
    ...auth,
    hasPermission: auth.hasPermission(permission),
    canAccess: auth.isAuthenticated && auth.hasPermission(permission)
  }
}

// Hook for role-based access
export function useRole(...roles: string[]) {
  const auth = useAuth()
  return {
    ...auth,
    hasRole: auth.hasRole(...roles),
    canAccess: auth.isAuthenticated && auth.hasRole(...roles)
  }
}
