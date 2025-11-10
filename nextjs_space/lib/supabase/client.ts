
'use client'

import { createBrowserClient } from '@supabase/ssr'
import { env } from '../config/env'

export function createClient() {
  // Using any type to work with custom schemas
  return createBrowserClient(
    env.supabase.url,
    env.supabase.anonKey
  )
}
