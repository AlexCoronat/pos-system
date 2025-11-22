/**
 * Roles Service
 * Handles custom role management for a business
 */

import { supabase } from '@/lib/supabase/client'
import { PERMISSION_MODULES as MODULES_CONFIG } from '@/lib/types/roles'

export interface Permission {
  module: string
  actions: string[]
}

export interface CustomRole {
  id: number
  name: string
  description?: string
  isSystem: boolean
  isActive: boolean
  permissions: Record<string, string[]>
  userCount: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateRoleData {
  name: string
  description?: string
  permissions: Record<string, string[]>
}

export interface UpdateRoleData {
  name?: string
  description?: string
  permissions?: Record<string, string[]>
  isActive?: boolean
}

// Re-export PERMISSION_MODULES in the format expected by the UI
export const PERMISSION_MODULES = MODULES_CONFIG.map(module => ({
  id: module.key,
  name: module.label,
  description: module.description,
  actions: module.actions.map(action => ({
    id: action.key,
    name: action.label,
    description: action.description
  }))
}))

class RolesService {
  /**
   * Get current user's business_id
   */
  private async getUserBusinessId(): Promise<number | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: currentUser } = await supabase
      .from('user_details')
      .select('business_id')
      .eq('id', user.id)
      .single()

    return currentUser?.business_id || null
  }

  /**
   * Log audit entry for role changes
   */
  private async logAudit(
    action: 'create' | 'update' | 'delete',
    roleId: number,
    roleName: string,
    changes?: { before?: any; after?: any }
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userDetails } = await supabase
        .from('user_details')
        .select('first_name, last_name, business_id')
        .eq('id', user.id)
        .single()

      // Try to insert into audit_log table if it exists
      const auditEntry = {
        entity_type: 'role',
        entity_id: roleId,
        action,
        user_id: user.id,
        user_name: userDetails ? `${userDetails.first_name} ${userDetails.last_name}` : user.email,
        business_id: userDetails?.business_id,
        details: {
          role_name: roleName,
          ...changes
        },
        created_at: new Date().toISOString()
      }

      // Attempt to insert - will fail silently if table doesn't exist
      const { error: auditError } = await supabase
        .from('audit_log')
        .insert(auditEntry)

      if (auditError) {
        // Table doesn't exist or other error, just log to console
        console.log(`[AUDIT] ${action.toUpperCase()} role "${roleName}" (ID: ${roleId}) by ${auditEntry.user_name}`, changes || '')
      } else {
        console.log(`[AUDIT] ${action.toUpperCase()} role "${roleName}" (ID: ${roleId}) by ${auditEntry.user_name}`)
      }
    } catch (error) {
      // Don't throw - audit should never break the main operation
      console.error('Error logging audit:', error)
    }
  }

  /**
   * Get all roles for the current user's business
   */
  async getRoles(): Promise<CustomRole[]> {
    try {
      // Get current user's business_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const { data: currentUser } = await supabase
        .from('user_details')
        .select('business_id')
        .eq('id', user.id)
        .single()

      // Build query for system roles and custom roles
      let query = supabase
        .from('roles')
        .select('*')

      if (currentUser?.business_id) {
        query = query.or(`business_id.is.null,business_id.eq.${currentUser.business_id}`)
      } else {
        query = query.is('business_id', null)
      }

      const { data, error } = await query
        .order('is_system', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error

      // Get user count per role
      const roleIds = (data || []).map(r => r.id)
      const { data: userCounts } = await supabase
        .from('user_details')
        .select('role_id')
        .in('role_id', roleIds)

      const countMap: Record<number, number> = {}
      for (const uc of userCounts || []) {
        if (uc.role_id) {
          countMap[uc.role_id] = (countMap[uc.role_id] || 0) + 1
        }
      }

      return (data || []).map((role: any) => ({
        id: role.id,
        name: role.name,
        description: role.description || undefined,
        isSystem: role.is_system,
        isActive: role.is_active,
        permissions: role.permissions || {},
        userCount: countMap[role.id] || 0,
        createdAt: new Date(role.created_at),
        updatedAt: new Date(role.updated_at)
      }))
    } catch (error: any) {
      console.error('Error getting roles:', error)
      throw new Error(error.message || 'Error al obtener roles')
    }
  }

  /**
   * Get a single role by ID
   */
  async getRole(roleId: number): Promise<CustomRole | null> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (error) throw error
      if (!data) return null

      return {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        isSystem: data.is_system,
        isActive: data.is_active,
        permissions: data.permissions || {},
        userCount: 0,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }
    } catch (error: any) {
      console.error('Error getting role:', error)
      throw new Error(error.message || 'Error al obtener rol')
    }
  }

  /**
   * Create a new custom role
   */
  async createRole(data: CreateRoleData): Promise<CustomRole> {
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

      const { data: role, error } = await supabase
        .from('roles')
        .insert({
          name: data.name,
          description: data.description || null,
          business_id: currentUser.business_id,
          is_system: false,
          is_active: true,
          permissions: data.permissions
        })
        .select()
        .single()

      if (error) throw error

      // Log audit
      await this.logAudit('create', role.id, role.name, {
        after: {
          name: role.name,
          description: role.description,
          permissions: data.permissions
        }
      })

      return {
        id: role.id,
        name: role.name,
        description: role.description || undefined,
        isSystem: false,
        isActive: true,
        permissions: role.permissions || {},
        userCount: 0,
        createdAt: new Date(role.created_at),
        updatedAt: new Date(role.updated_at)
      }
    } catch (error: any) {
      console.error('Error creating role:', error)
      throw new Error(error.message || 'Error al crear rol')
    }
  }

  /**
   * Update an existing role
   */
  async updateRole(roleId: number, data: UpdateRoleData): Promise<void> {
    try {
      // Get current user's business_id
      const userBusinessId = await this.getUserBusinessId()
      if (!userBusinessId) {
        throw new Error('Usuario no autenticado')
      }

      // Check if it's a system role and validate ownership
      const { data: existingRole } = await supabase
        .from('roles')
        .select('is_system, business_id, name, description, permissions')
        .eq('id', roleId)
        .single()

      if (!existingRole) {
        throw new Error('Rol no encontrado')
      }

      if (existingRole.is_system) {
        throw new Error('No se pueden modificar roles del sistema')
      }

      // Validate that the role belongs to the user's business
      if (existingRole.business_id !== userBusinessId) {
        throw new Error('No tienes permiso para modificar este rol')
      }

      const updateData: any = { updated_at: new Date().toISOString() }

      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.permissions !== undefined) updateData.permissions = data.permissions
      if (data.isActive !== undefined) updateData.is_active = data.isActive

      const { error } = await supabase
        .from('roles')
        .update(updateData)
        .eq('id', roleId)

      if (error) throw error

      // Log audit
      await this.logAudit('update', roleId, data.name || existingRole.name, {
        before: {
          name: existingRole.name,
          description: existingRole.description,
          permissions: existingRole.permissions
        },
        after: {
          name: data.name || existingRole.name,
          description: data.description !== undefined ? data.description : existingRole.description,
          permissions: data.permissions || existingRole.permissions
        }
      })
    } catch (error: any) {
      console.error('Error updating role:', error)
      throw new Error(error.message || 'Error al actualizar rol')
    }
  }

  /**
   * Delete a custom role
   */
  async deleteRole(roleId: number): Promise<void> {
    try {
      // Get current user's business_id
      const userBusinessId = await this.getUserBusinessId()
      if (!userBusinessId) {
        throw new Error('Usuario no autenticado')
      }

      // Check if it's a system role and validate ownership
      const { data: existingRole } = await supabase
        .from('roles')
        .select('is_system, business_id, name, description, permissions')
        .eq('id', roleId)
        .single()

      if (!existingRole) {
        throw new Error('Rol no encontrado')
      }

      if (existingRole.is_system) {
        throw new Error('No se pueden eliminar roles del sistema')
      }

      // Validate that the role belongs to the user's business
      if (existingRole.business_id !== userBusinessId) {
        throw new Error('No tienes permiso para eliminar este rol')
      }

      // Check if role is in use
      const { count } = await supabase
        .from('user_details')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', roleId)

      if (count && count > 0) {
        throw new Error('Este rol está asignado a usuarios. Reasígnalos antes de eliminar.')
      }

      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)

      if (error) throw error

      // Log audit
      await this.logAudit('delete', roleId, existingRole.name, {
        before: {
          name: existingRole.name,
          description: existingRole.description,
          permissions: existingRole.permissions
        }
      })
    } catch (error: any) {
      console.error('Error deleting role:', error)
      throw new Error(error.message || 'Error al eliminar rol')
    }
  }

  /**
   * Duplicate an existing role
   */
  async duplicateRole(roleId: number, newName: string): Promise<CustomRole> {
    try {
      const existingRole = await this.getRole(roleId)
      if (!existingRole) {
        throw new Error('Rol no encontrado')
      }

      return await this.createRole({
        name: newName,
        description: existingRole.description,
        permissions: existingRole.permissions
      })
    } catch (error: any) {
      console.error('Error duplicating role:', error)
      throw new Error(error.message || 'Error al duplicar rol')
    }
  }
}

export const rolesService = new RolesService()
