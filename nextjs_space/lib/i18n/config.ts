// Supported locales
export const locales = ['es', 'en'] as const
export type Locale = (typeof locales)[number]

// Default locale
export const defaultLocale: Locale = 'es'
