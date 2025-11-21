/**
 * Business Context Utilities
 * Helper functions for getting the current user's business context
 */

import { supabase } from '@/lib/supabase/client'

export interface BusinessContext {
  userId: string
  businessId: number
  defaultLocationId?: number
}

/**
 * Get the current user's business context
 * Throws an error if user is not authenticated or has no business assigned
 */
export async function getBusinessContext(): Promise<BusinessContext> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No authenticated user')
  }

  const { data: userDetails, error } = await supabase
    .from('user_details')
    .select('business_id, default_location_id')
    .eq('id', user.id)
    .single()

  if (error) {
    throw new Error('Error al obtener contexto del usuario')
  }

  if (!userDetails?.business_id) {
    throw new Error('User has no business assigned')
  }

  return {
    userId: user.id,
    businessId: userDetails.business_id,
    defaultLocationId: userDetails.default_location_id
  }
}

/**
 * Get just the business ID for the current user
 * Returns null if user is not authenticated or has no business
 */
export async function getCurrentBusinessId(): Promise<number | null> {
  try {
    const context = await getBusinessContext()
    return context.businessId
  } catch {
    return null
  }
}
