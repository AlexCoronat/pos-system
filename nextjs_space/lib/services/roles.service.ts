/**
 * Roles Service
 * Handles custom role management for a business
 */

import { supabase } from '@/lib/supabase/client'

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

// Available modules and their actions
export const PERMISSION_MODULES = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Panel principal con estadísticas',
    actions: [
      { id: 'view', name: 'Ver', description: 'Ver el dashboard' }
    ]
  },
  {
    id: 'products',
    name: 'Productos',
    description: 'Gestión de productos y catálogo',
    actions: [
      { id: 'view', name: 'Ver', description: 'Ver productos' },
      { id: 'create', name: 'Crear', description: 'Crear productos' },
      { id: 'edit', name: 'Editar', description: 'Editar productos' },
      { id: 'delete', name: 'Eliminar', description: 'Eliminar productos' }
    ]
  },
  {
    id: 'inventory',
    name: 'Inventario',
    description: 'Control de stock y movimientos',
    actions: [
      { id: 'view', name: 'Ver', description: 'Ver inventario' },
      { id: 'create', name: 'Crear', description: 'Registrar entradas' },
      { id: 'edit', name: 'Editar', description: 'Ajustar stock' },
      { id: 'delete', name: 'Eliminar', description: 'Eliminar movimientos' }
    ]
  },
  {
    id: 'sales',
    name: 'Ventas',
    description: 'Punto de venta y transacciones',
    actions: [
      { id: 'view', name: 'Ver', description: 'Ver ventas' },
      { id: 'create', name: 'Crear', description: 'Realizar ventas' },
      { id: 'edit', name: 'Editar', description: 'Editar ventas' },
      { id: 'delete', name: 'Eliminar', description: 'Eliminar ventas' },
      { id: 'cancel', name: 'Cancelar', description: 'Cancelar ventas' }
    ]
  },
  {
    id: 'customers',
    name: 'Clientes',
    description: 'Gestión de clientes',
    actions: [
      { id: 'view', name: 'Ver', description: 'Ver clientes' },
      { id: 'create', name: 'Crear', description: 'Crear clientes' },
      { id: 'edit', name: 'Editar', description: 'Editar clientes' },
      { id: 'delete', name: 'Eliminar', description: 'Eliminar clientes' }
    ]
  },
  {
    id: 'reports',
    name: 'Reportes',
    description: 'Reportes y análisis',
    actions: [
      { id: 'view', name: 'Ver', description: 'Ver reportes' },
      { id: 'export', name: 'Exportar', description: 'Exportar datos' }
    ]
  },
  {
    id: 'settings',
    name: 'Configuración',
    description: 'Configuración del sistema',
    actions: [
      { id: 'view', name: 'Ver', description: 'Ver configuración' },
      { id: 'edit', name: 'Editar', description: 'Modificar configuración' }
    ]
  },
  {
    id: 'users',
    name: 'Usuarios',
    description: 'Gestión de equipo',
    actions: [
      { id: 'view', name: 'Ver', description: 'Ver usuarios' },
      { id: 'create', name: 'Crear', description: 'Crear usuarios' },
      { id: 'edit', name: 'Editar', description: 'Editar usuarios' },
      { id: 'delete', name: 'Eliminar', description: 'Eliminar usuarios' }
    ]
  }
]

class RolesService {
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
      // Check if it's a system role
      const { data: existingRole } = await supabase
        .from('roles')
        .select('is_system')
        .eq('id', roleId)
        .single()

      if (existingRole?.is_system) {
        throw new Error('No se pueden modificar roles del sistema')
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
      // Check if it's a system role
      const { data: existingRole } = await supabase
        .from('roles')
        .select('is_system')
        .eq('id', roleId)
        .single()

      if (existingRole?.is_system) {
        throw new Error('No se pueden eliminar roles del sistema')
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
