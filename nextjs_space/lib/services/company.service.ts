import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ==========================================
// TYPES
// ==========================================

export interface CompanyInfo {
    id: number
    name: string
    legalName: string | null
    taxId: string | null
    logoUrl: string | null
    website: string | null
    email: string | null
    phone: string | null

    // Address
    address: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    country: string

    // Regional
    timezone: string
    currency: string

    // Branding (from metadata JSONB)
    branding?: {
        primaryColor?: string
        secondaryColor?: string
        slogan?: string
    }

    // Legal (from metadata JSONB)
    legal?: {
        terms?: string
        returnPolicy?: string
        invoiceNotes?: string
    }

    // Regional (from metadata JSONB)
    regional?: {
        dateFormat?: string
        locale?: string
    }
}

export interface UpdateCompanyData {
    name?: string
    legalName?: string
    taxId?: string
    website?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    timezone?: string
    currency?: string
}

export interface BrandingData {
    primaryColor?: string
    secondaryColor?: string
    slogan?: string
}

export interface LegalData {
    terms?: string
    returnPolicy?: string
    invoiceNotes?: string
}

// ==========================================
// COMPANY SERVICE
// ==========================================

class CompanyService {
    /**
     * Get current business information
     */
    async getCompanyInfo(): Promise<CompanyInfo> {
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .single()

        if (error) throw new Error('Error al obtener información de la empresa: ' + error.message)
        if (!data) throw new Error('No se encontró información de la empresa')

        // DEBUG: Log the raw database response to check address fields
        console.log('🔍 DEBUG - Raw business data from database:', {
            id: data.id,
            name: data.name,
            address: data.address,
            city: data.city,
            state: data.state,
            postal_code: data.postal_code,
            country: data.country
        })

        // Parse metadata JSONB
        const metadata = data.metadata || {}

        const companyInfo = {
            id: data.id,
            name: data.name,
            legalName: data.legal_name,
            taxId: data.tax_id,
            logoUrl: data.logo_url,
            website: data.website,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            state: data.state,
            postalCode: data.postal_code,
            country: data.country || 'Mexico',
            timezone: data.timezone || 'America/Mexico_City',
            currency: data.currency || 'MXN',
            branding: metadata.branding,
            legal: metadata.legal,
            regional: metadata.regional
        }

        // DEBUG: Log the mapped company info to verify transformation
        console.log('🔍 DEBUG - Mapped company info:', {
            address: companyInfo.address,
            city: companyInfo.city,
            state: companyInfo.state,
            postalCode: companyInfo.postalCode,
            country: companyInfo.country
        })

        return companyInfo
    }

    /**
     * Update basic company information
     */
    async updateCompanyInfo(data: UpdateCompanyData): Promise<void> {
        const updateData: any = {}

        if (data.name !== undefined) updateData.name = data.name
        if (data.legalName !== undefined) updateData.legal_name = data.legalName
        if (data.taxId !== undefined) updateData.tax_id = data.taxId
        if (data.website !== undefined) updateData.website = data.website
        if (data.email !== undefined) updateData.email = data.email
        if (data.phone !== undefined) updateData.phone = data.phone
        if (data.address !== undefined) updateData.address = data.address
        if (data.city !== undefined) updateData.city = data.city
        if (data.state !== undefined) updateData.state = data.state
        if (data.postalCode !== undefined) updateData.postal_code = data.postalCode
        if (data.country !== undefined) updateData.country = data.country
        if (data.timezone !== undefined) updateData.timezone = data.timezone
        if (data.currency !== undefined) updateData.currency = data.currency

        updateData.updated_at = new Date().toISOString()

        const { error } = await supabase
            .from('businesses')
            .update(updateData)
            .eq('id', await this.getCurrentBusinessId())

        if (error) throw new Error('Error al actualizar información: ' + error.message)
    }

    /**
     * Upload company logo (uses authenticated URLs for security)
     */
    async uploadLogo(file: File): Promise<string> {
        const businessId = await this.getCurrentBusinessId()
        const fileExt = file.name.split('.').pop()
        const fileName = `${businessId}/logo-${Date.now()}.${fileExt}`

        // Upload to Supabase Storage (private bucket with RLS)
        const { error: uploadError } = await supabase.storage
            .from('business-assets')
            .upload(fileName, file, {
                upsert: true,
                cacheControl: '3600'
            })

        if (uploadError) throw new Error('Error al subir logo: ' + uploadError.message)

        // Get signed URL (valid for 1 year - you may want to refresh this periodically)
        const { data: signedData, error: signError } = await supabase.storage
            .from('business-assets')
            .createSignedUrl(fileName, 31536000) // 1 year in seconds

        if (signError || !signedData?.signedUrl) {
            throw new Error('Error al obtener URL del logo')
        }

        // Update business record
        const { error: updateError } = await supabase
            .from('businesses')
            .update({
                logo_url: signedData.signedUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', businessId)

        if (updateError) throw new Error('Error al actualizar logo: ' + updateError.message)

        return signedData.signedUrl
    }

    /**
     * Update branding (colors, slogan)
     */
    async updateBranding(branding: BrandingData): Promise<void> {
        const businessId = await this.getCurrentBusinessId()

        // Get current metadata
        const { data: current } = await supabase
            .from('businesses')
            .select('metadata')
            .eq('id', businessId)
            .single()

        const metadata = current?.metadata || {}

        // Update branding section
        const updatedMetadata = {
            ...metadata,
            branding: {
                ...metadata.branding,
                ...branding
            }
        }

        const { error } = await supabase
            .from('businesses')
            .update({
                metadata: updatedMetadata,
                updated_at: new Date().toISOString()
            })
            .eq('id', businessId)

        if (error) throw new Error('Error al actualizar branding: ' + error.message)
    }

    /**
     * Update legal information (terms, policies)
     */
    async updateLegal(legal: LegalData): Promise<void> {
        const businessId = await this.getCurrentBusinessId()

        // Get current metadata
        const { data: current } = await supabase
            .from('businesses')
            .select('metadata')
            .eq('id', businessId)
            .single()

        const metadata = current?.metadata || {}

        // Update legal section
        const updatedMetadata = {
            ...metadata,
            legal: {
                ...metadata.legal,
                ...legal
            }
        }

        const { error } = await supabase
            .from('businesses')
            .update({
                metadata: updatedMetadata,
                updated_at: new Date().toISOString()
            })
            .eq('id', businessId)

        if (error) throw new Error('Error al actualizar información legal: ' + error.message)
    }

    /**
     * Update regional settings (date format, locale)
     */
    async updateRegional(regional: { dateFormat?: string; locale?: string }): Promise<void> {
        const businessId = await this.getCurrentBusinessId()

        // Get current metadata
        const { data: current } = await supabase
            .from('businesses')
            .select('metadata')
            .eq('id', businessId)
            .single()

        const metadata = current?.metadata || {}

        // Update regional section
        const updatedMetadata = {
            ...metadata,
            regional: {
                ...metadata.regional,
                ...regional
            }
        }

        const { error } = await supabase
            .from('businesses')
            .update({
                metadata: updatedMetadata,
                updated_at: new Date().toISOString()
            })
            .eq('id', businessId)

        if (error) throw new Error('Error al actualizar configuración regional: ' + error.message)
    }

    /**
     * Helper: Get current business ID
     */
    private async getCurrentBusinessId(): Promise<number> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuario no autenticado')

        const { data } = await supabase
            .from('user_details')
            .select('business_id')
            .eq('id', user.id)
            .single()

        if (!data?.business_id) throw new Error('Usuario sin negocio asignado')

        return data.business_id
    }
}

export const companyService = new CompanyService()
