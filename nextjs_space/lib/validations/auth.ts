/**
 * Authentication validation schemas using Zod
 * Provides type-safe validation for auth-related forms
 */

import { z } from 'zod'
import { AUTH_CONSTANTS } from '@/lib/constants/auth'

// Email validation
const emailSchema = z.string().email('Invalid email address')

// Password validation based on requirements
const passwordSchema = z
  .string()
  .min(AUTH_CONSTANTS.PASSWORD.MIN_LENGTH, `Password must be at least ${AUTH_CONSTANTS.PASSWORD.MIN_LENGTH} characters`)
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Phone validation (optional)
const phoneSchema = z
  .string()
  .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number')
  .optional()
  .or(z.literal(''))

// Login validation schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Register validation schema
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: phoneSchema,
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterFormData = z.infer<typeof registerSchema>

// Complete profile validation schema (for OAuth users)
export const completeProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: phoneSchema,
  address: z.string().optional(),
})

export type CompleteProfileFormData = z.infer<typeof completeProfileSchema>

// Update profile validation schema
export const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  phone: phoneSchema,
  avatarUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
})

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>

// Change password validation schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

// Reset password validation schema
export const resetPasswordSchema = z.object({
  email: emailSchema,
})

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
