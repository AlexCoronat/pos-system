/**
 * Team Service
 * Handles team member management for a business
 */

import { supabase } from '@/lib/supabase/client'

export interface TeamMember {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  roleId: number
  roleName: string
  isSystemRole: boolean
  isActive: boolean
  isOwner: boolean
  defaultLocationId?: number
  locationName?: string
  assignedLocations: {
    id: number
    locationId: number
    locationName: string
    isPrimary: boolean
  }[]
  lastLoginAt?: Date
  createdAt: Date
}

export interface CreateTeamMemberData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  roleId?: number
  locationIds: number[]
  primaryLocationId: number
}

export interface UpdateTeamMemberData {
  firstName?: string
  lastName?: string
  phone?: string
  roleId?: number
  isActive?: boolean
}

export interface RoleOption {
  id: number
  name: string
  isSystem: boolean
}

class TeamService {
  /**
   * Get all team members for the current user's business
   */
  async getTeamMembers(): Promise<TeamMember[]> {
    try {
      // First get current user's business_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data: currentUser } = await supabase
        .from('user_details')
        .select('business_id')
        .eq('id', user.id)
        .single()

      if (!currentUser?.business_id) {
        throw new Error('User has no business assigned')
      }

      // Get business owner
      const { data: business } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', currentUser.business_id)
        .single()

      // Get all team members
      const { data, error } = await supabase
        .from('user_details')
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone,
          role_id,
          is_active,
          default_location_id,
          last_login_at,
          created_at,
          role:roles!role_id(id, name, is_system),
          defaultLocation:locations!default_location_id(id, name),
          userLocations:user_locations!user_locations_user_id_fkey(
            id,
            location_id,
            is_primary,
            location:locations!location_id(id, name)
          )
        `)
        .eq('business_id', currentUser.business_id)
        .eq('is_active', true)
        .order('first_name', { ascending: true })

      if (error) throw error

      return (data || []).map((member: any) => ({
        id: member.id,
        email: member.email || '',
        firstName: member.first_name || '',
        lastName: member.last_name || '',
        phone: member.phone || undefined,
        roleId: member.role_id,
        roleName: member.role?.name || 'Sin rol',
        isSystemRole: member.role?.is_system ?? false,
        isActive: member.is_active ?? true,
        isOwner: member.id === business?.owner_id,
        defaultLocationId: member.default_location_id || undefined,
        locationName: member.defaultLocation?.name || undefined,
        assignedLocations: (member.userLocations || []).map((ul: any) => ({
          id: ul.id,
          locationId: ul.location_id,
          locationName: ul.location?.name || 'Ubicación',
          isPrimary: ul.is_primary
        })),
        lastLoginAt: member.last_login_at ? new Date(member.last_login_at) : undefined,
        createdAt: new Date(member.created_at)
      }))
    } catch (error: any) {
      console.error('Error getting team members:', error)
      throw new Error(error.message || 'Error al obtener miembros del equipo')
    }
  }

  /**
   * Add a new team member to the business
   */
  async addTeamMember(data: CreateTeamMemberData): Promise<TeamMember> {
    try {
      // Get current user's business_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data: currentUser } = await supabase
        .from('user_details')
        .select('business_id')
        .eq('id', user.id)
        .single()

      if (!currentUser?.business_id) {
        throw new Error('User has no business assigned')
      }

      // Check plan limits
      const { data: canAdd } = await supabase
        .rpc('check_plan_limit', {
          p_business_id: currentUser.business_id,
          p_resource_type: 'users'
        })

      if (!canAdd) {
        throw new Error('Has alcanzado el límite de usuarios de tu plan')
      }

      // Create auth user using admin API (this requires service role key)
      // For now, we'll use signUp which will send a confirmation email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone || null
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('No user returned from registration')

      const newUserId = authData.user.id

      // Update user_details with business and role
      const { error: updateError } = await supabase
        .from('user_details')
        .update({
          business_id: currentUser.business_id,
          role_id: data.roleId || 3, // Default to Cashier
          default_location_id: data.primaryLocationId
        })
        .eq('id', newUserId)

      if (updateError) throw updateError

      // Assign locations
      for (const locationId of data.locationIds) {
        await supabase
          .from('user_locations')
          .insert({
            user_id: newUserId,
            location_id: locationId,
            is_primary: locationId === data.primaryLocationId
          })
      }

      // Fetch and return the created member
      const members = await this.getTeamMembers()
      const newMember = members.find(m => m.id === newUserId)

      if (!newMember) {
        throw new Error('Error retrieving created member')
      }

      return newMember
    } catch (error: any) {
      console.error('Error adding team member:', error)
      throw new Error(error.message || 'Error al agregar miembro del equipo')
    }
  }

  /**
   * Update a team member
   */
  async updateTeamMember(memberId: string, data: UpdateTeamMemberData): Promise<void> {
    try {
      const updateData: any = {}

      if (data.firstName !== undefined) updateData.first_name = data.firstName
      if (data.lastName !== undefined) updateData.last_name = data.lastName
      if (data.phone !== undefined) updateData.phone = data.phone
      if (data.roleId !== undefined) updateData.role_id = data.roleId
      if (data.isActive !== undefined) updateData.is_active = data.isActive

      const { error } = await supabase
        .from('user_details')
        .update(updateData)
        .eq('id', memberId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error updating team member:', error)
      throw new Error(error.message || 'Error al actualizar miembro')
    }
  }

  /**
   * Toggle team member active status
   */
  async toggleMemberStatus(memberId: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_details')
        .update({ is_active: isActive })
        .eq('id', memberId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error toggling member status:', error)
      throw new Error(error.message || 'Error al cambiar estado del miembro')
    }
  }

  /**
   * Update member locations
   */
  async updateMemberLocations(
    memberId: string,
    locationIds: number[],
    primaryLocationId: number
  ): Promise<void> {
    try {
      // Remove existing locations
      await supabase
        .from('user_locations')
        .delete()
        .eq('user_id', memberId)

      // Add new locations
      for (const locationId of locationIds) {
        await supabase
          .from('user_locations')
          .insert({
            user_id: memberId,
            location_id: locationId,
            is_primary: locationId === primaryLocationId
          })
      }

      // Update default location
      await supabase
        .from('user_details')
        .update({ default_location_id: primaryLocationId })
        .eq('id', memberId)
    } catch (error: any) {
      console.error('Error updating member locations:', error)
      throw new Error(error.message || 'Error al actualizar ubicaciones')
    }
  }

  /**
   * Get available roles for assignment
   */
  async getAvailableRoles(): Promise<RoleOption[]> {
    try {
      // Get current user's business_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data: currentUser } = await supabase
        .from('user_details')
        .select('business_id')
        .eq('id', user.id)
        .single()

      // Build query for system roles and custom roles for this business
      let query = supabase
        .from('roles')
        .select('id, name, is_system')
        .eq('is_active', true)

      // If user has a business, get system roles + their custom roles
      // Otherwise just get system roles
      if (currentUser?.business_id) {
        query = query.or(`business_id.is.null,business_id.eq.${currentUser.business_id}`)
      } else {
        query = query.is('business_id', null)
      }

      const { data, error } = await query
        .order('is_system', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error

      return (data || []).map(role => ({
        id: role.id,
        name: role.name,
        isSystem: role.is_system
      }))
    } catch (error: any) {
      console.error('Error getting available roles:', error)
      throw new Error(error.message || 'Error al obtener roles')
    }
  }

  /**
   * Remove a team member from the business
   * This archives the user and removes them from active tables
   */
  async removeMember(memberId: string, reason?: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .rpc('archive_and_remove_user', {
          p_user_id: memberId,
          p_removal_reason: reason || null
        })

      if (error) throw error

      return data
    } catch (error: any) {
      console.error('Error removing team member:', error)
      throw new Error(error.message || 'Error al remover miembro')
    }
  }

  /**
   * Get archived users for the business
   */
  async getArchivedUsers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_archived_users')

      if (error) throw error

      return data || []
    } catch (error: any) {
      console.error('Error getting archived users:', error)
      throw new Error(error.message || 'Error al obtener usuarios archivados')
    }
  }
}

export const teamService = new TeamService()
