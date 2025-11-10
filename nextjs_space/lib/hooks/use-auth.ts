/**
 * Authentication hook (Optimized)
 * Provides auth state and methods to components
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '../services/auth.service'
import { ROUTES } from '../constants'
import type {
  AuthState,
  AuthUser,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
  ChangePasswordData
} from '../types/auth'

/**
 * Main auth hook
 */
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

  const loginWithGoogle = async (): Promise<void> => {
    return authService.loginWithGoogle()
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
    loginWithGoogle,
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

/**
 * Hook for protected routes
 * Redirects to login if user is not authenticated
 */
export function useRequireAuth() {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (auth.initialized && !auth.loading && !auth.isAuthenticated) {
      router.push(ROUTES.AUTH.LOGIN)
    }
  }, [auth.initialized, auth.loading, auth.isAuthenticated, router])

  return auth
}

/**
 * Hook for permission-based access
 */
export function usePermission(permission: string) {
  const auth = useAuth()
  return {
    ...auth,
    hasPermission: auth.hasPermission(permission),
    canAccess: auth.isAuthenticated && auth.hasPermission(permission)
  }
}

/**
 * Hook for role-based access
 */
export function useRole(...roles: string[]) {
  const auth = useAuth()
  return {
    ...auth,
    hasRole: auth.hasRole(...roles),
    canAccess: auth.isAuthenticated && auth.hasRole(...roles)
  }
}
