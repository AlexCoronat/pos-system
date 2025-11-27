import { supabase } from '@/lib/supabase/client'
import { getBusinessContext } from '@/lib/utils/business-context'
import type {
  Location,
  LocationListItem,
  CreateLocationData,
  UpdateLocationData,
  UserLocation,
  UserWithLocations,
  AssignUserLocationData
} from '@/lib/types/settings'

class LocationService {
  /**
   * Get all locations for the current user's business
   */
  async getLocations(): Promise<LocationListItem[]> {
    try {
      // Get business context to filter by business_id
      const { businessId } = await getBusinessContext()

      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          user_locations(id)
        `)
        .eq('business_id', businessId)
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) throw error

      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        code: item.code,
        city: item.city,
        state: item.state,
        phone: item.phone,
        isActive: item.is_active ?? true,
        mainLocation: item.main_location,
        userCount: item.user_locations?.length || 0,
        createdAt: new Date(item.created_at)
      }))
    } catch (error: any) {
      console.error('Error getting locations:', error)
      throw new Error(error.message || 'Error al obtener ubicaciones')
    }
  }

  /**
   * Get a single location by ID
   */
  async getLocationById(locationId: number): Promise<Location> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      if (!data) throw new Error('Ubicación no encontrada')

      return {
        id: data.id,
        name: data.name,
        code: data.code,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postal_code,
        country: data.country,
        phone: data.phone,
        email: data.email,
        isActive: data.is_active ?? true,
        mainLocation: data.main_location,
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined
      }
    } catch (error: any) {
      console.error('Error getting location:', error)
      throw new Error(error.message || 'Error al obtener ubicación')
    }
  }

  /**
   * Create a new location
   */
  async createLocation(data: CreateLocationData): Promise<Location> {
    try {
      // Get business context
      const { businessId } = await getBusinessContext()

      const { data: location, error } = await supabase
        .from('locations')
        .insert({
          business_id: businessId,
          name: data.name,
          code: data.code || `LOC-${businessId}-${Date.now()}`,
          address: data.address,
          city: data.city,
          state: data.state,
          postal_code: data.postalCode,
          country: data.country || 'Mexico',
          phone: data.phone,
          email: data.email,
          is_active: data.isActive ?? true,
          main_location: data.mainLocation,
          metadata: data.metadata
        })
        .select()
        .single()

      if (error) throw error

      return await this.getLocationById(location.id)
    } catch (error: any) {
      console.error('Error creating location:', error)
      throw new Error(error.message || 'Error al crear ubicación')
    }
  }

  /**
   * Update an existing location
   */
  async updateLocation(locationId: number, data: UpdateLocationData): Promise<Location> {
    try {
      const updateData: any = {}

      if (data.name !== undefined) updateData.name = data.name
      if (data.code !== undefined) updateData.code = data.code
      if (data.address !== undefined) updateData.address = data.address
      if (data.city !== undefined) updateData.city = data.city
      if (data.state !== undefined) updateData.state = data.state
      if (data.postalCode !== undefined) updateData.postal_code = data.postalCode
      if (data.country !== undefined) updateData.country = data.country
      if (data.phone !== undefined) updateData.phone = data.phone
      if (data.email !== undefined) updateData.email = data.email
      if (data.isActive !== undefined) updateData.is_active = data.isActive
      if (data.metadata !== undefined) updateData.metadata = data.metadata

      // Special handling for main_location to avoid unique constraint violation
      // If setting this location as main, first clear all other main locations
      if (data.mainLocation === 1) {
        const { businessId } = await getBusinessContext()

        // Clear all main_location flags for this business first
        await supabase
          .from('locations')
          .update({ main_location: null })
          .eq('business_id', businessId)
          .eq('main_location', 1)

        // Now we can safely set this location as main
        updateData.main_location = 1
      } else if (data.mainLocation !== undefined) {
        // If explicitly setting to null or other value
        updateData.main_location = data.mainLocation
      }

      const { error } = await supabase
        .from('locations')
        .update(updateData)
        .eq('id', locationId)

      if (error) throw error

      return await this.getLocationById(locationId)
    } catch (error: any) {
      console.error('Error updating location:', error)
      throw new Error(error.message || 'Error al actualizar ubicación')
    }
  }

  /**
   * Soft delete a location
   */
  async deleteLocation(locationId: number): Promise<void> {
    try {
      // Check if location has users assigned
      const { count } = await supabase
        .from('user_locations')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationId)

      if (count && count > 0) {
        throw new Error('No se puede eliminar una ubicación con usuarios asignados')
      }

      const { error } = await supabase
        .from('locations')
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', locationId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error deleting location:', error)
      throw new Error(error.message || 'Error al eliminar ubicación')
    }
  }

  /**
   * Get users with their assigned locations (filtered by business)
   */
  async getUsersWithLocations(): Promise<UserWithLocations[]> {
    try {
      // Get business context to filter by business_id
      const { businessId } = await getBusinessContext()

      const { data, error } = await supabase
        .from('user_details')
        .select(`
          id,
          first_name,
          last_name,
          email,
          is_active,
          default_location_id,
          role:roles!role_id(name),
          user_locations!user_id(
            id,
            location_id,
            is_primary,
            location:locations(id, name, code, city)
          )
        `)
        .eq('business_id', businessId)
        .order('first_name', { ascending: true })

      if (error) throw error

      return (data || []).map(user => {
        // Handle role which may be an object or array
        const role = Array.isArray(user.role) ? user.role[0] : user.role

        return {
          id: user.id,
          email: user.email || '',
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          roleName: role?.name || 'Sin rol',
          isActive: user.is_active ?? true,
          defaultLocationId: user.default_location_id,
          assignedLocations: (user.user_locations || []).map((ul: any) => ({
            id: ul.id,
            userId: user.id,
            locationId: ul.location_id,
            isPrimary: ul.is_primary,
            location: ul.location ? {
              id: ul.location.id,
              name: ul.location.name,
              code: ul.location.code,
              city: ul.location.city
            } : undefined,
            createdAt: new Date()
          }))
        }
      })
    } catch (error: any) {
      console.error('Error getting users with locations:', error)
      throw new Error(error.message || 'Error al obtener usuarios')
    }
  }

  /**
   * Assign a user to a location
   */
  async assignUserToLocation(data: AssignUserLocationData): Promise<void> {
    try {
      // Check if already assigned
      const { data: existing } = await supabase
        .from('user_locations')
        .select('id')
        .eq('user_id', data.userId)
        .eq('location_id', data.locationId)
        .single()

      if (existing) {
        throw new Error('El usuario ya está asignado a esta ubicación')
      }

      // If this is primary, unset other primary locations for this user
      if (data.isPrimary) {
        await supabase
          .from('user_locations')
          .update({ is_primary: false })
          .eq('user_id', data.userId)
      }

      const { error } = await supabase
        .from('user_locations')
        .insert({
          user_id: data.userId,
          location_id: data.locationId,
          is_primary: data.isPrimary ?? false
        })

      if (error) throw error

      // If primary, also update default_location_id in user_details
      if (data.isPrimary) {
        await supabase
          .from('user_details')
          .update({ default_location_id: data.locationId })
          .eq('user_id', data.userId)
      }
    } catch (error: any) {
      console.error('Error assigning user to location:', error)
      throw new Error(error.message || 'Error al asignar usuario a ubicación')
    }
  }

  /**
   * Remove a user from a location
   */
  async removeUserFromLocation(userId: string, locationId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_locations')
        .delete()
        .eq('user_id', userId)
        .eq('location_id', locationId)

      if (error) throw error

      // If this was the default location, clear it
      const { data: userDetails } = await supabase
        .from('user_details')
        .select('default_location_id')
        .eq('user_id', userId)
        .single()

      if (userDetails?.default_location_id === locationId) {
        // Set another location as default if available
        const { data: otherLocation } = await supabase
          .from('user_locations')
          .select('location_id')
          .eq('user_id', userId)
          .limit(1)
          .single()

        await supabase
          .from('user_details')
          .update({
            default_location_id: otherLocation?.location_id || null
          })
          .eq('user_id', userId)
      }
    } catch (error: any) {
      console.error('Error removing user from location:', error)
      throw new Error(error.message || 'Error al remover usuario de ubicación')
    }
  }

  /**
   * Set a location as primary for a user
   */
  async setUserPrimaryLocation(userId: string, locationId: number): Promise<void> {
    try {
      // Unset all other primary locations for this user
      await supabase
        .from('user_locations')
        .update({ is_primary: false })
        .eq('user_id', userId)

      // Set this location as primary
      const { error } = await supabase
        .from('user_locations')
        .update({ is_primary: true })
        .eq('user_id', userId)
        .eq('location_id', locationId)

      if (error) throw error

      // Update default_location_id in user_details
      await supabase
        .from('user_details')
        .update({ default_location_id: locationId })
        .eq('user_id', userId)
    } catch (error: any) {
      console.error('Error setting primary location:', error)
      throw new Error(error.message || 'Error al establecer ubicación principal')
    }
  }

  /**
   * Get the first available location (for auto-assignment)
   */
  async getFirstLocation(): Promise<Location | null> {
    try {
      // Get business context to filter by business_id
      const { businessId } = await getBusinessContext()

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('business_id', businessId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (!data) return null

      return {
        id: data.id,
        name: data.name,
        code: data.code,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postal_code,
        country: data.country,
        phone: data.phone,
        email: data.email,
        isActive: data.is_active ?? true,
        mainLocation: data.main_location,
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }
    } catch (error: any) {
      console.error('Error getting first location:', error)
      return null
    }
  }

  /**
   * Get the main/primary location for the business
   */
  async getMainLocation(): Promise<Location | null> {
    try {
      // Get business context to filter by business_id
      const { businessId } = await getBusinessContext()

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('business_id', businessId)
        .eq('main_location', 1)
        .is('deleted_at', null)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (!data) return null

      return {
        id: data.id,
        name: data.name,
        code: data.code,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postal_code,
        country: data.country,
        phone: data.phone,
        email: data.email,
        isActive: data.is_active ?? true,
        mainLocation: data.main_location,
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }
    } catch (error: any) {
      console.error('Error getting main location:', error)
      return null
    }
  }
}

export const locationService = new LocationService()
