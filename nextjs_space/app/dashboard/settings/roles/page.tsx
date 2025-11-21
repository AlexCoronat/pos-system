'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Shield, Plus, Pencil, Trash2, Copy, Users,
  ChevronDown, ChevronRight, Check, X, Loader2, Lock, ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { rolesService, CustomRole, PERMISSION_MODULES } from '@/lib/services/roles.service'

export default function RolesPage() {
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, string[]>
  })

  // Expanded modules in permission editor
  const [expandedModules, setExpandedModules] = useState<string[]>([])

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      setIsLoading(true)
      const data = await rolesService.getRoles()
      setRoles(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al cargar roles',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: {}
    })
    setExpandedModules([])
  }

  const openCreateDialog = () => {
    resetForm()
    setIsCreateOpen(true)
  }

  const openEditDialog = (role: CustomRole) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: { ...role.permissions }
    })
    setExpandedModules(Object.keys(role.permissions))
    setIsEditOpen(true)
  }

  const openDeleteDialog = (role: CustomRole) => {
    setSelectedRole(role)
    setIsDeleteOpen(true)
  }

  const handleDuplicate = async (role: CustomRole) => {
    try {
      setIsSaving(true)
      await rolesService.duplicateRole(role.id, `${role.name} (copia)`)
      toast({
        title: 'Rol duplicado',
        description: 'El rol ha sido duplicado exitosamente'
      })
      await loadRoles()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al duplicar rol',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del rol es requerido',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsSaving(true)
      await rolesService.createRole({
        name: formData.name,
        description: formData.description || undefined,
        permissions: formData.permissions
      })
      toast({
        title: 'Rol creado',
        description: 'El rol ha sido creado exitosamente'
      })
      setIsCreateOpen(false)
      await loadRoles()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al crear rol',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedRole) return

    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del rol es requerido',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsSaving(true)
      await rolesService.updateRole(selectedRole.id, {
        name: formData.name,
        description: formData.description || undefined,
        permissions: formData.permissions
      })
      toast({
        title: 'Rol actualizado',
        description: 'El rol ha sido actualizado exitosamente'
      })
      setIsEditOpen(false)
      await loadRoles()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar rol',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRole) return

    try {
      setIsSaving(true)
      await rolesService.deleteRole(selectedRole.id)
      toast({
        title: 'Rol eliminado',
        description: 'El rol ha sido eliminado exitosamente'
      })
      setIsDeleteOpen(false)
      await loadRoles()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al eliminar rol',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const togglePermission = (moduleId: string, actionId: string) => {
    setFormData(prev => {
      const currentActions = prev.permissions[moduleId] || []
      const newActions = currentActions.includes(actionId)
        ? currentActions.filter(a => a !== actionId)
        : [...currentActions, actionId]

      const newPermissions = { ...prev.permissions }
      if (newActions.length > 0) {
        newPermissions[moduleId] = newActions
      } else {
        delete newPermissions[moduleId]
      }

      return { ...prev, permissions: newPermissions }
    })
  }

  const toggleAllModuleActions = (moduleId: string, actions: string[]) => {
    setFormData(prev => {
      const currentActions = prev.permissions[moduleId] || []
      const allSelected = actions.every(a => currentActions.includes(a))

      const newPermissions = { ...prev.permissions }
      if (allSelected) {
        delete newPermissions[moduleId]
      } else {
        newPermissions[moduleId] = actions
      }

      return { ...prev, permissions: newPermissions }
    })
  }

  const getPermissionCount = (permissions: Record<string, string[]>) => {
    return Object.values(permissions).reduce((sum, actions) => sum + actions.length, 0)
  }

  const PermissionEditor = () => (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {PERMISSION_MODULES.map(module => {
        const isExpanded = expandedModules.includes(module.id)
        const selectedActions = formData.permissions[module.id] || []
        const allSelected = module.actions.every(a => selectedActions.includes(a.id))
        const someSelected = selectedActions.length > 0 && !allSelected

        return (
          <Collapsible key={module.id} open={isExpanded}>
            <div className="border rounded-lg">
              <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => toggleAllModuleActions(module.id, module.actions.map(a => a.id))}
                  />
                  <div
                    className="text-left flex-1 cursor-pointer"
                    onClick={() => toggleModuleExpanded(module.id)}
                  >
                    <div className="font-medium">{module.name}</div>
                    <div className="text-xs text-muted-foreground">{module.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedActions.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedActions.length}/{module.actions.length}
                    </Badge>
                  )}
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleModuleExpanded(module.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent>
                <div className="border-t p-3 space-y-2 bg-muted/30">
                  {module.actions.map(action => (
                    <label
                      key={action.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-background p-2 rounded"
                    >
                      <Checkbox
                        checked={selectedActions.includes(action.id)}
                        onCheckedChange={() => togglePermission(module.id, action.id)}
                      />
                      <div>
                        <div className="text-sm font-medium">{action.name}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}
    </div>
  )

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8" />
              Roles y Permisos
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Administra los roles y permisos de tu equipo
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Rol
        </Button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(role => (
          <Card key={role.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {role.name}
                    {role.isSystem && (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  {role.description && (
                    <CardDescription className="mt-1">
                      {role.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!role.isSystem && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(role)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDuplicate(role)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(role)}
                        disabled={role.userCount > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {role.isSystem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDuplicate(role)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{role.userCount} usuarios</span>
                </div>
                <Badge variant={role.isSystem ? 'secondary' : 'outline'}>
                  {role.isSystem ? 'Sistema' : 'Personalizado'}
                </Badge>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {getPermissionCount(role.permissions)} permisos asignados
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roles.length === 0 && (
        <Card className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay roles</h3>
          <p className="text-muted-foreground mb-4">
            Crea tu primer rol personalizado para asignar permisos a tu equipo
          </p>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Rol
          </Button>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Rol</DialogTitle>
            <DialogDescription>
              Define un nuevo rol con permisos personalizados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del rol *</Label>
              <Input
                id="name"
                placeholder="Ej: Supervisor de ventas"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripcion</Label>
              <Textarea
                id="description"
                placeholder="Describe las responsabilidades de este rol..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Permisos</Label>
              <PermissionEditor />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Crear Rol
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Rol</DialogTitle>
            <DialogDescription>
              Modifica los permisos de este rol
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre del rol *</Label>
              <Input
                id="edit-name"
                placeholder="Ej: Supervisor de ventas"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripcion</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe las responsabilidades de este rol..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Permisos</Label>
              <PermissionEditor />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Rol</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de que deseas eliminar el rol "{selectedRole?.name}"?
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
