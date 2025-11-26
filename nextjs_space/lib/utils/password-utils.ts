/**
 * Password Utilities
 * Functions for temporary password generation, encryption, and validation
 */

import CryptoJS from 'crypto-js'

/**
 * Generate a secure temporary password
 * Format: 3 uppercase letters + 3 numbers + 3 special chars
 * Example: ABC123!@#
 */
export function generateTemporaryPassword(): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // Removed I, O for clarity
    const numbers = '23456789' // Removed 0, 1 for clarity
    const special = '!@#$%&*'

    const getRandomChars = (chars: string, length: number): string => {
        let result = ''
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }

    // Generate parts
    const upperPart = getRandomChars(uppercase, 3)
    const numberPart = getRandomChars(numbers, 3)
    const specialPart = getRandomChars(special, 3)

    // Combine parts
    return `${upperPart}${numberPart}${specialPart}`
}

/**
 * Encrypt temporary password for storage
 * Uses AES encryption with environment variable key
 */
export function encryptPassword(password: string): string {
    const encryptionKey = process.env.NEXT_PUBLIC_TEMP_PASSWORD_KEY || 'default-key-change-in-production'

    if (encryptionKey === 'default-key-change-in-production') {
        console.warn('⚠️  Using default encryption key. Set NEXT_PUBLIC_TEMP_PASSWORD_KEY in .env')
    }

    return CryptoJS.AES.encrypt(password, encryptionKey).toString()
}

/**
 * Decrypt temporary password
 */
export function decryptPassword(encrypted: string): string {
    const encryptionKey = process.env.NEXT_PUBLIC_TEMP_PASSWORD_KEY || 'default-key-change-in-production'

    const bytes = CryptoJS.AES.decrypt(encrypted, encryptionKey)
    return bytes.toString(CryptoJS.enc.Utf8)
}

/**
 * Validate username format
 * Rules: 3-50 chars, alphanumeric + underscore/dash only, no spaces
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
    if (!username || username.trim().length === 0) {
        return { valid: false, error: 'El nombre de usuario es requerido' }
    }

    if (username.length < 3) {
        return { valid: false, error: 'El nombre de usuario debe tener al menos 3 caracteres' }
    }

    if (username.length > 50) {
        return { valid: false, error: 'El nombre de usuario no puede exceder 50 caracteres' }
    }

    // Check for valid characters (alphanumeric, underscore, dash only)
    const validPattern = /^[a-zA-Z0-9_-]+$/
    if (!validPattern.test(username)) {
        return { valid: false, error: 'Solo se permiten letras, números, guiones y guiones bajos' }
    }

    // Check for spaces
    if (/\s/.test(username)) {
        return { valid: false, error: 'El nombre de usuario no puede contener espacios' }
    }

    return { valid: true }
}

/**
 * Generate internal email from username
 * Used for Supabase Auth when user chooses username over email
 */
export function generateInternalEmail(username: string, domain: string = 'internal.system'): string {
    return `${username.toLowerCase()}@${domain}`
}

/**
 * Check if email is an internal/system email
 */
export function isInternalEmail(email: string): boolean {
    return email.endsWith('@internal.system')
}

/**
 * Extract username from internal email
 */
export function extractUsernameFromEmail(email: string): string | null {
    if (!isInternalEmail(email)) {
        return null
    }

    return email.split('@')[0]
}

/**
 * Validate password strength
 * Used when user changes password from temporary
 */
export function validatePasswordStrength(password: string): {
    valid: boolean
    strength: 'weak' | 'medium' | 'strong'
    errors: string[]
} {
    const errors: string[] = []
    let strength: 'weak' | 'medium' | 'strong' = 'weak'

    if (password.length < 8) {
        errors.push('La contraseña debe tener al menos 8 caracteres')
    }

    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (!hasUppercase) {
        errors.push('Debe incluir al menos una letra mayúscula')
    }
    if (!hasLowercase) {
        errors.push('Debe incluir al menos una letra minúscula')
    }
    if (!hasNumber) {
        errors.push('Debe incluir al menos un número')
    }
    if (!hasSpecial) {
        errors.push('Debe incluir al menos un carácter especial')
    }

    // Determine strength
    const criteriaCount = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length

    if (password.length >= 12 && criteriaCount === 4) {
        strength = 'strong'
    } else if (password.length >= 8 && criteriaCount >= 3) {
        strength = 'medium'
    }

    return {
        valid: errors.length === 0,
        strength,
        errors
    }
}
