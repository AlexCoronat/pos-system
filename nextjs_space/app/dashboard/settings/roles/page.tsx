'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
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
import { useAuth } from '@/lib/hooks/use-auth'
import { rolesService, CustomRole, PERMISSION_MODULES } from '@/lib/services/roles.service'

export default function RolesPage() {
  const t = useTranslations('roles')
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
  const { user, hasPermission, initialized, loading } = useAuth()

  // Permission checks
  const canRead = hasPermission('roles:read')
  const canCreate = hasPermission('roles:create')
  const canUpdate = hasPermission('roles:update')
  const canDelete = hasPermission('roles:delete')

  // Redirect if no permission
  useEffect(() => {
    if (initialized && !loading && !canRead) {
      router.push('/access-denied')
    }
  }, [initialized, loading, canRead, router])

  useEffect(() => {
    if (canRead) {
      loadRoles()
    }
  }, [canRead])

  const loadRoles = async () => {
    try {
      setIsLoading(true)
      const data = await rolesService.getRoles()
      setRoles(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || t('messages.loadError'),
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
        title: t('messages.roleDuplicated'),
        description: t('messages.roleDuplicatedDesc')
      })
      await loadRoles()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || t('messages.duplicateError'),
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
        description: t('messages.roleNameRequired'),
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
        title: t('messages.roleCreated'),
        description: t('messages.roleCreatedDesc')
      })
      setIsCreateOpen(false)
      await loadRoles()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || t('messages.createError'),
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
        description: t('messages.roleNameRequired'),
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
        title: t('messages.roleUpdated'),
        description: t('messages.roleUpdatedDesc')
      })
      setIsEditOpen(false)
      await loadRoles()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || t('messages.updateError'),
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
        title: t('messages.roleDeleted'),
        description: t('messages.roleDeletedDesc')
      })
      setIsDeleteOpen(false)
      await loadRoles()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || t('messages.deleteError'),
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
              {t('title')}
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">
            {t('subtitle')}
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('newRole')}
          </Button>
        )}
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
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(role)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canCreate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDuplicate(role)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(role)}
                          disabled={role.userCount > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                  {role.isSystem && canCreate && (
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
                  <span>{role.userCount} {role.userCount === 1 ? t('stats.user') : t('stats.users')}</span>
                </div>
                <Badge variant={role.isSystem ? 'secondary' : 'outline'}>
                  {role.isSystem ? t('badges.system') : t('badges.custom')}
                </Badge>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {getPermissionCount(role.permissions)} {getPermissionCount(role.permissions) === 1 ? t('stats.permission') : t('stats.permissions')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roles.length === 0 && (
        <Card className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('empty.title')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('empty.description')}
          </p>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('empty.createRole')}
          </Button>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('createDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('createDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('createDialog.roleName')}</Label>
              <Input
                id="name"
                placeholder={t('createDialog.roleNamePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('createDialog.roleDescription')}</Label>
              <Textarea
                id="description"
                placeholder={t('createDialog.roleDescriptionPlaceholder')}
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
              {t('createDialog.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('createDialog.creating')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('createDialog.create')}
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
            <DialogTitle>{t('editDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('editDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('createDialog.roleName')}</Label>
              <Input
                id="edit-name"
                placeholder={t('createDialog.roleNamePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">{t('createDialog.roleDescription')}</Label>
              <Textarea
                id="edit-description"
                placeholder={t('createDialog.roleDescriptionPlaceholder')}
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
              {t('editDialog.cancel')}
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('editDialog.saving')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('editDialog.save')}
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
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: selectedRole?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('deleteDialog.deleting')}
                </>
              ) : (
                t('deleteDialog.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
