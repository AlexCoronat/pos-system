/**
 * Locale-aware formatting utilities for dates, numbers, and currency
 * 
 * Uses the Intl API for consistent, standards-based formatting across locales.
 * Supports Spanish (es) and English (en) with proper format conventions.
 */

import { useLocale } from 'next-intl'

/**
 * Format a date according to locale
 * 
 * @param date - Date object or ISO string
 * @param locale - Locale code ('es' or 'en')
 * @param options - Intl.DateTimeFormatOptions for custom formatting
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date('2024-11-25'), 'es') // "25/11/2024"
 * formatDate(new Date('2024-11-25'), 'en') // "11/25/2024"
 */
export function formatDate(
    date: Date | string,
    locale: string = 'es',
    options?: Intl.DateTimeFormatOptions
): string {
    if (!date) return ''

    const dateObj = typeof date === 'string' ? new Date(date) : date

    // Check for invalid date
    if (isNaN(dateObj.getTime())) return ''

    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...options
    }

    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj)
}

/**
 * Format a date with time according to locale
 * 
 * @param date - Date object or ISO string
 * @param locale - Locale code
 * @param use24Hour - Use 24-hour format (default: true)
 * @returns Formatted datetime string
 * 
 * @example
 * formatDateTime(new Date(), 'es') // "25/11/2024, 14:30"
 */
export function formatDateTime(
    date: Date | string,
    locale: string = 'es',
    use24Hour: boolean = true
): string {
    if (!date) return ''

    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''

    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: !use24Hour
    }).format(dateObj)
}

/**
 * Format time only
 * 
 * @param date - Date object or ISO string
 * @param locale - Locale code
 * @param use24Hour - Use 24-hour format
 * @returns Formatted time string
 * 
 * @example
 * formatTime(new Date(), 'es') // "14:30"
 * formatTime(new Date(), 'en', false) // "2:30 PM"
 */
export function formatTime(
    date: Date | string,
    locale: string = 'es',
    use24Hour: boolean = true
): string {
    if (!date) return ''

    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''

    return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !use24Hour
    }).format(dateObj)
}

/**
 * Format a number according to locale
 * 
 * @param value - Number to format
 * @param locale - Locale code
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234.56, 'es') // "1.234,56"
 * formatNumber(1234.56, 'en') // "1,234.56"
 */
export function formatNumber(
    value: number,
    locale: string = 'es',
    decimals: number = 2
): string {
    if (value === null || value === undefined) return ''

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value)
}

/**
 * Format currency (Mexican Peso) according to locale
 * 
 * @param amount - Amount to format
 * @param locale - Locale code
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56, 'es') // "$1.234,56"
 * formatCurrency(1234.56, 'en') // "$1,234.56"
 */
export function formatCurrency(
    amount: number,
    locale: string = 'es'
): string {
    if (amount === null || amount === undefined) return ''

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount)
}

/**
 * Format a date range
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @param locale - Locale code
 * @returns Formatted date range string
 * 
 * @example
 * formatDateRange(new Date('2024-11-25'), new Date('2024-11-30'), 'es')
 * // "25/11/2024 - 30/11/2024"
 */
export function formatDateRange(
    startDate: Date | string,
    endDate: Date | string,
    locale: string = 'es'
): string {
    const start = formatDate(startDate, locale)
    const end = formatDate(endDate, locale)

    if (!start || !end) return ''

    return `${start} - ${end}`
}

/**
 * Format relative time (e.g., "hace 2 horas", "2 hours ago")
 * 
 * @param date - Date to compare against now
 * @param locale - Locale code
 * @returns Formatted relative time string
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000), 'es') // "hace 2 horas"
 * formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000), 'en') // "2 hours ago"
 */
export function formatRelativeTime(
    date: Date | string,
    locale: string = 'es'
): string {
    if (!date) return ''

    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''

    const now = new Date()
    const diff = now.getTime() - dateObj.getTime()

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)

    // Use Intl.RelativeTimeFormat for proper localization
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

    if (years > 0) return rtf.format(-years, 'year')
    if (months > 0) return rtf.format(-months, 'month')
    if (days > 0) return rtf.format(-days, 'day')
    if (hours > 0) return rtf.format(-hours, 'hour')
    if (minutes > 0) return rtf.format(-minutes, 'minute')
    return rtf.format(-seconds, 'second')
}

/**
 * Format percentage
 * 
 * @param value - Decimal value (e.g., 0.25 for 25%)
 * @param locale - Locale code
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercentage(0.2556, 'es') // "25,56%"
 * formatPercentage(0.2556, 'en') // "25.56%"
 */
export function formatPercentage(
    value: number,
    locale: string = 'es',
    decimals: number = 2
): string {
    if (value === null || value === undefined) return ''

    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value)
}

/**
 * Hook to get locale-aware formatters
 * 
 * Use this in React components to automatically use the current locale
 * 
 * @returns Object with formatting functions
 * 
 * @example
 * function ProductPrice({ price }) {
 *   const { formatCurrency } = useFormatters()
 *   return <span>{formatCurrency(price)}</span>
 * }
 */
export function useFormatters() {
    const locale = useLocale()

    return {
        formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
            formatDate(date, locale, options),

        formatDateTime: (date: Date | string, use24Hour?: boolean) =>
            formatDateTime(date, locale, use24Hour),

        formatTime: (date: Date | string, use24Hour?: boolean) =>
            formatTime(date, locale, use24Hour),

        formatNumber: (value: number, decimals?: number) =>
            formatNumber(value, locale, decimals),

        formatCurrency: (amount: number) =>
            formatCurrency(amount, locale),

        formatDateRange: (startDate: Date | string, endDate: Date | string) =>
            formatDateRange(startDate, endDate, locale),

        formatRelativeTime: (date: Date | string) =>
            formatRelativeTime(date, locale),

        formatPercentage: (value: number, decimals?: number) =>
            formatPercentage(value, locale, decimals)
    }
}
