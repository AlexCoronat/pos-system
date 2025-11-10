/**
 * Centralized error handling utilities
 */

import { AuthError } from '@/lib/types/auth'

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'APP_ERROR',
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', 401, details)
    this.name = 'AuthenticationError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, details)
    this.name = 'NotFoundError'
  }
}

/**
 * Parse error to AuthError format
 */
export const parseAuthError = (error: any): AuthError => {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    }
  }

  // Handle Supabase errors
  if (error?.code) {
    return {
      code: error.code,
      message: error.message || 'An error occurred',
      details: error,
    }
  }

  // Handle generic errors
  return {
    code: 'UNKNOWN_ERROR',
    message: error?.message || 'An unexpected error occurred',
    details: error,
  }
}

/**
 * Log error with context
 */
export const logError = (error: any, context?: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context || 'Error'}]:`, error)
  }

  // In production, you would send this to an error tracking service
  // like Sentry, LogRocket, etc.
}

/**
 * Get user-friendly error message
 */
export const getUserFriendlyMessage = (error: any): string => {
  // Map common error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'auth/invalid-email': 'The email address is invalid',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password is too weak',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'PGRST116': 'Invalid credentials',
  }

  const code = error?.code || error?.error?.code
  if (code && errorMessages[code]) {
    return errorMessages[code]
  }

  return error?.message || 'An unexpected error occurred'
}
