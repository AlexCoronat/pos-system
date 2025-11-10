
// Generated Supabase types for the custom POS schema structure
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Define the custom schemas - NOT using 'public'
export interface Database {
  public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Custom schema types - since Supabase client may not support custom schemas directly
export interface POSDatabase {
  'pos_core.roles': {
    Row: {
      id: number
      name: string
      description: string | null
      permissions: Json
      is_active: boolean
      created_at: string
      updated_at: string
    }
    Insert: {
      name: string
      description?: string | null
      permissions?: Json
      is_active?: boolean
      created_at?: string
      updated_at?: string
    }
    Update: {
      name?: string
      description?: string | null
      permissions?: Json
      is_active?: boolean
      updated_at?: string
    }
  }
  'pos_core.locations': {
    Row: {
      id: number
      name: string
      code: string
      address: string | null
      city: string | null
      state: string | null
      postal_code: string | null
      country: string
      phone: string | null
      email: string | null
      manager_id: string | null
      is_active: boolean
      opening_hours: Json | null
      timezone: string
      metadata: Json
      created_at: string
      updated_at: string
      deleted_at: string | null
    }
    Insert: {
      name: string
      code: string
      address?: string | null
      city?: string | null
      state?: string | null
      postal_code?: string | null
      country?: string
      phone?: string | null
      email?: string | null
      manager_id?: string | null
      is_active?: boolean
      opening_hours?: Json | null
      timezone?: string
      metadata?: Json
      created_at?: string
      updated_at?: string
    }
    Update: {
      name?: string
      code?: string
      address?: string | null
      city?: string | null
      state?: string | null
      postal_code?: string | null
      country?: string
      phone?: string | null
      email?: string | null
      manager_id?: string | null
      is_active?: boolean
      opening_hours?: Json | null
      timezone?: string
      metadata?: Json
      updated_at?: string
      deleted_at?: string | null
    }
  }
  'pos_core.users': {
    Row: {
      id: string  // UUID from Supabase Auth
      email: string
      first_name: string | null
      last_name: string | null
      phone: string | null
      role_id: number | null
      default_location_id: number | null
      is_active: boolean
      last_login_at: string | null
      email_verified: boolean
      avatar_url: string | null
      metadata: Json
      created_at: string
      updated_at: string
      deleted_at: string | null
    }
    Insert: {
      id: string
      email: string
      first_name?: string | null
      last_name?: string | null
      phone?: string | null
      role_id?: number | null
      default_location_id?: number | null
      is_active?: boolean
      last_login_at?: string | null
      email_verified?: boolean
      avatar_url?: string | null
      metadata?: Json
      created_at?: string
      updated_at?: string
    }
    Update: {
      email?: string
      first_name?: string | null
      last_name?: string | null
      phone?: string | null
      role_id?: number | null
      default_location_id?: number | null
      is_active?: boolean
      last_login_at?: string | null
      email_verified?: boolean
      avatar_url?: string | null
      metadata?: Json
      updated_at?: string
      deleted_at?: string | null
    }
  }
  'pos_core.user_locations': {
    Row: {
      id: number
      user_id: string
      location_id: number
      is_primary: boolean
      created_at: string
    }
    Insert: {
      user_id: string
      location_id: number
      is_primary?: boolean
      created_at?: string
    }
    Update: {
      is_primary?: boolean
    }
  }
  'pos_core.user_sessions': {
    Row: {
      id: number
      user_id: string
      location_id: number | null
      session_token: string | null
      ip_address: string | null
      user_agent: string | null
      started_at: string
      ended_at: string | null
      is_active: boolean
    }
    Insert: {
      user_id: string
      location_id?: number | null
      session_token?: string | null
      ip_address?: string | null
      user_agent?: string | null
      started_at?: string
      ended_at?: string | null
      is_active?: boolean
    }
    Update: {
      ended_at?: string | null
      is_active?: boolean
    }
  }
}
