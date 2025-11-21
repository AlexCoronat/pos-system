/**
 * Types for Roles and Permissions Module
 */

// Permission modules
export type PermissionModule =
  | 'sales'
  | 'inventory'
  | 'customers'
  | 'reports'
  | 'settings'
  | 'users'
  | 'roles'
  | 'locations'
  | 'billing'

// Permission actions
export type PermissionAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'cancel'
  | 'refund'
  | 'adjust'
  | 'transfer'
  | 'export'

// Permissions structure
export type Permissions = {
  [key in PermissionModule]?: PermissionAction[]
}

export interface CustomRole {
  id: number
  businessId: number | null // null for system roles
  name: string
  description?: string
  permissions: Permissions
  isSystem: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface RoleListItem {
  id: number
  name: string
  description?: string
  isSystem: boolean
  isActive: boolean
  userCount?: number
}

export interface CreateRoleData {
  name: string
  description?: string
  permissions: Permissions
}

export interface UpdateRoleData {
  name?: string
  description?: string
  permissions?: Permissions
  isActive?: boolean
}

// Module configuration for UI
export interface ModuleConfig {
  key: PermissionModule
  label: string
  description: string
  actions: {
    key: PermissionAction
    label: string
    description: string
  }[]
}

// All available modules with their actions
export const PERMISSION_MODULES: ModuleConfig[] = [
  {
    key: 'sales',
    label: 'Ventas',
    description: 'Gestión de ventas y transacciones',
    actions: [
      { key: 'read', label: 'Ver', description: 'Ver lista de ventas' },
      { key: 'create', label: 'Crear', description: 'Crear nuevas ventas' },
      { key: 'update', label: 'Editar', description: 'Modificar ventas existentes' },
      { key: 'delete', label: 'Eliminar', description: 'Eliminar ventas' },
      { key: 'cancel', label: 'Cancelar', description: 'Cancelar ventas' },
      { key: 'refund', label: 'Reembolsar', description: 'Procesar reembolsos' },
    ]
  },
  {
    key: 'inventory',
    label: 'Inventario',
    description: 'Gestión de productos y stock',
    actions: [
      { key: 'read', label: 'Ver', description: 'Ver productos e inventario' },
      { key: 'create', label: 'Crear', description: 'Crear nuevos productos' },
      { key: 'update', label: 'Editar', description: 'Modificar productos' },
      { key: 'delete', label: 'Eliminar', description: 'Eliminar productos' },
      { key: 'adjust', label: 'Ajustar', description: 'Ajustar cantidades de stock' },
      { key: 'transfer', label: 'Transferir', description: 'Transferir entre ubicaciones' },
    ]
  },
  {
    key: 'customers',
    label: 'Clientes',
    description: 'Gestión de clientes',
    actions: [
      { key: 'read', label: 'Ver', description: 'Ver lista de clientes' },
      { key: 'create', label: 'Crear', description: 'Crear nuevos clientes' },
      { key: 'update', label: 'Editar', description: 'Modificar clientes' },
      { key: 'delete', label: 'Eliminar', description: 'Eliminar clientes' },
    ]
  },
  {
    key: 'reports',
    label: 'Reportes',
    description: 'Acceso a reportes y análisis',
    actions: [
      { key: 'read', label: 'Ver', description: 'Ver reportes' },
      { key: 'export', label: 'Exportar', description: 'Exportar reportes' },
    ]
  },
  {
    key: 'settings',
    label: 'Configuración',
    description: 'Configuración del sistema',
    actions: [
      { key: 'read', label: 'Ver', description: 'Ver configuración' },
      { key: 'update', label: 'Editar', description: 'Modificar configuración' },
    ]
  },
  {
    key: 'users',
    label: 'Usuarios',
    description: 'Gestión de usuarios del equipo',
    actions: [
      { key: 'read', label: 'Ver', description: 'Ver usuarios' },
      { key: 'create', label: 'Crear', description: 'Agregar usuarios' },
      { key: 'update', label: 'Editar', description: 'Modificar usuarios' },
      { key: 'delete', label: 'Eliminar', description: 'Eliminar usuarios' },
    ]
  },
  {
    key: 'roles',
    label: 'Roles',
    description: 'Gestión de roles y permisos',
    actions: [
      { key: 'read', label: 'Ver', description: 'Ver roles' },
      { key: 'create', label: 'Crear', description: 'Crear roles' },
      { key: 'update', label: 'Editar', description: 'Modificar roles' },
      { key: 'delete', label: 'Eliminar', description: 'Eliminar roles' },
    ]
  },
  {
    key: 'locations',
    label: 'Ubicaciones',
    description: 'Gestión de sucursales',
    actions: [
      { key: 'read', label: 'Ver', description: 'Ver ubicaciones' },
      { key: 'create', label: 'Crear', description: 'Crear ubicaciones' },
      { key: 'update', label: 'Editar', description: 'Modificar ubicaciones' },
      { key: 'delete', label: 'Eliminar', description: 'Eliminar ubicaciones' },
    ]
  },
  {
    key: 'billing',
    label: 'Facturación',
    description: 'Plan y suscripción',
    actions: [
      { key: 'read', label: 'Ver', description: 'Ver plan actual' },
      { key: 'update', label: 'Editar', description: 'Cambiar plan' },
    ]
  },
]

// Helper to get all actions for a module
export function getModuleActions(module: PermissionModule): PermissionAction[] {
  const config = PERMISSION_MODULES.find(m => m.key === module)
  return config ? config.actions.map(a => a.key) : []
}

// Helper to check if user has permission
export function hasPermission(
  permissions: Permissions,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  return permissions[module]?.includes(action) ?? false
}

// Helper to check if user has any of the specified permissions
export function hasAnyPermission(
  permissions: Permissions,
  checks: Array<{ module: PermissionModule; action: PermissionAction }>
): boolean {
  return checks.some(({ module, action }) => hasPermission(permissions, module, action))
}
