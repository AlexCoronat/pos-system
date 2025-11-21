/**
 * Utility functions for generating product SKU and barcode
 */

/**
 * Generate a SKU prefix from category name
 * Takes first 3 consonants or letters from the category name
 */
export function generateCategoryPrefix(categoryName: string): string {
  if (!categoryName) return 'GEN' // General

  // Remove accents and special characters
  const normalized = categoryName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')

  // Get first 3 consonants, or first 3 letters if not enough consonants
  const consonants = normalized.replace(/[AEIOU]/g, '')

  if (consonants.length >= 3) {
    return consonants.substring(0, 3)
  }

  // Fallback to first 3 letters
  return normalized.substring(0, 3).padEnd(3, 'X')
}

/**
 * Generate a complete SKU from category prefix and sequential number
 */
export function generateSKU(categoryPrefix: string, sequentialNumber: number): string {
  const paddedNumber = sequentialNumber.toString().padStart(3, '0')
  return `${categoryPrefix}-${paddedNumber}`
}

/**
 * Generate an internal barcode in EAN-13 format
 * Uses prefix 200-299 which is reserved for internal use
 * Format: 20[business_id_3_digits][product_id_7_digits][check_digit]
 */
export function generateInternalBarcode(businessId: number, productId: number): string {
  // Use 20 as prefix for internal codes
  const prefix = '20'

  // Business ID (3 digits, max 999)
  const businessPart = (businessId % 1000).toString().padStart(3, '0')

  // Product ID (7 digits)
  const productPart = (productId % 10000000).toString().padStart(7, '0')

  // Combine without check digit (should be 12 digits: 2 + 3 + 7)
  const codeWithoutCheck = prefix + businessPart + productPart

  // Calculate EAN-13 check digit
  const checkDigit = calculateEAN13CheckDigit(codeWithoutCheck)

  return codeWithoutCheck + checkDigit
}

/**
 * Calculate the check digit for EAN-13 barcode
 */
function calculateEAN13CheckDigit(code: string): string {
  if (code.length !== 12) {
    throw new Error('Code must be 12 digits for EAN-13 check digit calculation')
  }

  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10)
    // Odd positions (0, 2, 4...) multiply by 1, even positions multiply by 3
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit.toString()
}

/**
 * Generate a random alphanumeric code (alternative SKU format)
 */
export function generateRandomCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Validate EAN-13 barcode format
 */
export function isValidEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) {
    return false
  }

  const codeWithoutCheck = barcode.substring(0, 12)
  const providedCheckDigit = barcode.charAt(12)
  const calculatedCheckDigit = calculateEAN13CheckDigit(codeWithoutCheck)

  return providedCheckDigit === calculatedCheckDigit
}

/**
 * Common category prefixes for Mexican retail
 */
export const CATEGORY_PREFIXES: Record<string, string> = {
  'Bebidas': 'BEB',
  'Alimentos': 'ALI',
  'Lácteos': 'LAC',
  'Carnes': 'CRN',
  'Frutas': 'FRT',
  'Verduras': 'VRD',
  'Panadería': 'PAN',
  'Abarrotes': 'ABR',
  'Limpieza': 'LIM',
  'Higiene': 'HIG',
  'Electrónicos': 'ELC',
  'Ropa': 'ROP',
  'Papelería': 'PAP',
  'Ferretería': 'FER',
  'Mascotas': 'MAS',
  'Farmacia': 'FAR',
  'Dulces': 'DLC',
  'Botanas': 'BOT',
  'Congelados': 'CNG',
  'General': 'GEN'
}

/**
 * Get category prefix, using predefined if available, otherwise generate
 */
export function getCategoryPrefix(categoryName: string): string {
  // Check predefined prefixes first
  const predefined = CATEGORY_PREFIXES[categoryName]
  if (predefined) {
    return predefined
  }

  // Generate from category name
  return generateCategoryPrefix(categoryName)
}
