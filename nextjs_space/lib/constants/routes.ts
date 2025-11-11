/**
 * Application routes constants
 * Centralized route definitions to avoid hardcoded strings
 */

export const ROUTES = {
  // Public routes
  HOME: '/',

  // Auth routes
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    CALLBACK: '/auth/callback',
    COMPLETE_PROFILE: '/auth/complete-profile',
    RECOVER_PASSWORD: '/auth/recover-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },

  // App routes
  DASHBOARD: '/dashboard',
  SESSIONS: '/dashboard/sessions',
  PROFILE: '/dashboard/profile',

  // Legal routes
  PRIVACY: '/privacy',
  TERMS: '/terms',

  // Test routes (remove in production)
  TEST_ENV: '/test-env',
} as const

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
  },
} as const

// Helper function to check if route is public
export const isPublicRoute = (pathname: string): boolean => {
  const publicRoutes: readonly string[] = [
    ROUTES.HOME,
    ROUTES.AUTH.LOGIN,
    ROUTES.AUTH.REGISTER,
    ROUTES.AUTH.CALLBACK,
    ROUTES.AUTH.RECOVER_PASSWORD,
    ROUTES.AUTH.RESET_PASSWORD,
    ROUTES.AUTH.VERIFY_EMAIL,
    ROUTES.PRIVACY,
    ROUTES.TERMS,
  ]

  return publicRoutes.includes(pathname)
}

// Helper function to check if route requires auth
export const requiresAuth = (pathname: string): boolean => {
  return pathname.startsWith('/dashboard') || pathname === ROUTES.AUTH.COMPLETE_PROFILE
}
