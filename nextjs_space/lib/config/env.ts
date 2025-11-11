/**
 * Environment variables configuration
 * Centralized access to environment variables with type safety
 * 
 * IMPORTANT: Variables de entorno en Next.js
 * - Las variables que empiezan con NEXT_PUBLIC_ están disponibles en el cliente
 * - Otras variables solo están disponibles en el servidor
 * - process.env debe accederse con notación de punto, no con corchetes
 */

// Acceso directo a las variables - evaluadas en tiempo de construcción
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'POS System'
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

// Validación en tiempo de construcción
if (!SUPABASE_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const env = {
  // Supabase - disponibles en cliente y servidor
  supabase: {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  },

  // App
  app: {
    name: APP_NAME,
    url: NEXTAUTH_URL,
  },

  // Node environment
  get isDevelopment() {
    return process.env.NODE_ENV === 'development'
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production'
  },
  get isTest() {
    return process.env.NODE_ENV === 'test'
  },
}

export type Env = typeof env