/**
 * Environment variables configuration
 * Centralized access to environment variables with type safety
 */

const getEnvVar = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

const getOptionalEnvVar = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue
}

// Use getters to defer evaluation until access time
export const env = {
  // Supabase
  supabase: {
    get url() {
      return getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
    },
    get anonKey() {
      return getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    },
  },

  // App
  app: {
    get name() {
      return getOptionalEnvVar('NEXT_PUBLIC_APP_NAME', 'POS System')
    },
    get url() {
      return getOptionalEnvVar('NEXTAUTH_URL', 'http://localhost:3000')
    },
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
