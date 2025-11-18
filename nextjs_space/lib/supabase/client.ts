
'use client'

import { createBrowserClient } from '@supabase/ssr'
import { env } from '../config/env'

export function createClient() {
  // Using any type to work with custom schemas
  return createBrowserClient(
    env.supabase.url,
    env.supabase.anonKey,
    {
      db: {
        schema: 'public'
      }
    }
  )
}

// Export a singleton instance for use in services
export const supabase = createClient()
