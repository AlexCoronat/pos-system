
'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Using any type to work with custom schemas
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
