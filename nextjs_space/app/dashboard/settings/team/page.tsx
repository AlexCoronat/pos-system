'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  Plus,
  MoreHorizontal,
  UserPlus,
  Shield,
  MapPin,
  Loader2,
  Crown,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Trash2,
  Archive
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { teamService, TeamMember, RoleOption, CreateTeamMemberData } from '@/lib/services/team.service'
import { locationService } from '@/lib/services/location.service'
import type { LocationListItem } from '@/lib/types/settings'
import { toast } from 'sonner'

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [locations, setLocations] = useState<LocationListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleId: '',
    locationIds: [] as number[],
    primaryLocationId: ''
  })

  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    roleId: '',
    locationIds: [] as number[],
    primaryLocationId: ''
  })

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [membersData, rolesData, locationsData] = await Promise.all([
        teamService.getTeamMembers(),
        teamService.getAvailableRoles(),
        locationService.getLocations()
      ])
      setMembers(membersData)
      setRoles(rolesData)
      setLocations(locationsData)
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      roleId: '',
      locationIds: [],
      primaryLocationId: ''
    })
  }

  const handleOpenDialog = () => {
    resetForm()
    // Pre-select first location if available
    if (locations.length > 0) {
      setFormData(prev => ({
        ...prev,
        locationIds: [locations[0].id],
        primaryLocationId: locations[0].id.toString()
      }))
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    if (formData.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (formData.locationIds.length === 0) {
      toast.error('Debes seleccionar al menos una ubicación')
      return
    }

    setIsSaving(true)

    try {
      const data: CreateTeamMemberData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        roleId: formData.roleId ? parseInt(formData.roleId) : undefined,
        locationIds: formData.locationIds,
        primaryLocationId: parseInt(formData.primaryLocationId)
      }

      await teamService.addTeamMember(data)
      toast.success('Miembro agregado correctamente')
      setDialogOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar miembro')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async (member: TeamMember) => {
    if (member.isOwner) {
      toast.error('No puedes desactivar al propietario del negocio')
      return
    }

    try {
      await teamService.toggleMemberStatus(member.id, !member.isActive)
      toast.success(member.isActive ? 'Usuario desactivado' : 'Usuario activado')
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar estado')
    }
  }

  const handleOpenEditDialog = (member: TeamMember) => {
    setSelectedMember(member)
    setEditFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone || '',
      roleId: member.roleId.toString(),
      locationIds: member.assignedLocations.map(l => l.locationId),
      primaryLocationId: member.assignedLocations.find(l => l.isPrimary)?.locationId.toString() ||
        (member.assignedLocations[0]?.locationId.toString() || '')
    })
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMember) return

    if (!editFormData.firstName || !editFormData.lastName) {
      toast.error('Nombre y apellido son requeridos')
      return
    }

    if (editFormData.locationIds.length === 0) {
      toast.error('Debes seleccionar al menos una ubicación')
      return
    }

    setIsSaving(true)

    try {
      // Update member details
      await teamService.updateTeamMember(selectedMember.id, {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        phone: editFormData.phone || undefined,
        roleId: editFormData.roleId ? parseInt(editFormData.roleId) : undefined
      })

      // Update locations
      await teamService.updateMemberLocations(
        selectedMember.id,
        editFormData.locationIds,
        parseInt(editFormData.primaryLocationId)
      )

      toast.success('Usuario actualizado correctamente')
      setEditDialogOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar usuario')
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenDeleteDialog = (member: TeamMember) => {
    if (member.isOwner) {
      toast.error('No puedes eliminar al propietario del negocio')
      return
    }
    setSelectedMember(member)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedMember) return

    setIsSaving(true)
    try {
      await teamService.removeMember(selectedMember.id)
      toast.success('Usuario eliminado correctamente')
      setDeleteDialogOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar usuario')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditLocationToggle = (locationId: number) => {
    setEditFormData(prev => {
      const newIds = prev.locationIds.includes(locationId)
        ? prev.locationIds.filter(id => id !== locationId)
        : [...prev.locationIds, locationId]

      // If removing primary location, set new primary
      let newPrimary = prev.primaryLocationId
      if (prev.primaryLocationId === locationId.toString() && !newIds.includes(locationId)) {
        newPrimary = newIds.length > 0 ? newIds[0].toString() : ''
      }

      return {
        ...prev,
        locationIds: newIds,
        primaryLocationId: newPrimary
      }
    })
  }

  const handleLocationToggle = (locationId: number) => {
    setFormData(prev => {
      const newIds = prev.locationIds.includes(locationId)
        ? prev.locationIds.filter(id => id !== locationId)
        : [...prev.locationIds, locationId]

      // If removing primary location, set new primary
      let newPrimary = prev.primaryLocationId
      if (prev.primaryLocationId === locationId.toString() && !newIds.includes(locationId)) {
        newPrimary = newIds.length > 0 ? newIds[0].toString() : ''
      }

      return {
        ...prev,
        locationIds: newIds,
        primaryLocationId: newPrimary
      }
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Equipo</h1>
            <p className="text-muted-foreground">
              Gestiona los usuarios de tu negocio
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/settings/team/archived">
            <Button variant="outline">
              <Archive className="h-4 w-4 mr-2" />
              Ver Archivados
            </Button>
          </Link>
          <Button onClick={handleOpenDialog}>
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar Usuario
          </Button>
        </div>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Miembros del Equipo
          </CardTitle>
          <CardDescription>
            {members.length} usuario{members.length !== 1 ? 's' : ''} en tu negocio
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay miembros en el equipo</p>
              <Button className="mt-4" onClick={handleOpenDialog}>
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar Primer Usuario
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Ubicaciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {member.firstName[0]}{member.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {member.firstName} {member.lastName}
                            {member.isOwner && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Shield className="h-3 w-3" />
                        {member.roleName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.assignedLocations.map((loc) => (
                          <Badge
                            key={loc.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            {loc.locationName}
                          </Badge>
                        ))}
                        {member.assignedLocations.length === 0 && (
                          <span className="text-sm text-muted-foreground">
                            Sin ubicaciones
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.isActive ? 'default' : 'secondary'}
                        className={member.isActive ? 'bg-green-100 text-green-800' : ''}
                      >
                        {member.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.lastLoginAt ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(member.lastLoginAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Nunca
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenEditDialog(member)}
                            disabled={member.isOwner}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(member)}
                            disabled={member.isOwner}
                          >
                            {member.isActive ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOpenDeleteDialog(member)}
                            disabled={member.isOwner}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar Usuario</DialogTitle>
            <DialogDescription>
              Crea una cuenta para un nuevo miembro de tu equipo
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Apellido"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@email.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  className="pl-10"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => setFormData({ ...formData, roleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                      {role.isSystem && ' (Sistema)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Locations */}
            <div className="space-y-2">
              <Label>Ubicaciones *</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {locations.map((location) => (
                  <div key={location.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`loc-${location.id}`}
                        checked={formData.locationIds.includes(location.id)}
                        onCheckedChange={() => handleLocationToggle(location.id)}
                      />
                      <Label htmlFor={`loc-${location.id}`} className="text-sm font-normal">
                        {location.name}
                      </Label>
                    </div>
                    {formData.locationIds.includes(location.id) && (
                      <Button
                        type="button"
                        variant={formData.primaryLocationId === location.id.toString() ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setFormData({ ...formData, primaryLocationId: location.id.toString() })}
                      >
                        {formData.primaryLocationId === location.id.toString() ? 'Principal' : 'Hacer principal'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Agregar Usuario
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica la información de {selectedMember?.firstName} {selectedMember?.lastName}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">Nombre *</Label>
                <Input
                  id="edit-firstName"
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Apellido *</Label>
                <Input
                  id="edit-lastName"
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  placeholder="Apellido"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="edit-phone"
                  type="tel"
                  className="pl-10"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={editFormData.roleId}
                onValueChange={(value) => setEditFormData({ ...editFormData, roleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                      {role.isSystem && ' (Sistema)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Locations */}
            <div className="space-y-2">
              <Label>Ubicaciones *</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {locations.map((location) => (
                  <div key={location.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-loc-${location.id}`}
                        checked={editFormData.locationIds.includes(location.id)}
                        onCheckedChange={() => handleEditLocationToggle(location.id)}
                      />
                      <Label htmlFor={`edit-loc-${location.id}`} className="text-sm font-normal">
                        {location.name}
                      </Label>
                    </div>
                    {editFormData.locationIds.includes(location.id) && (
                      <Button
                        type="button"
                        variant={editFormData.primaryLocationId === location.id.toString() ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setEditFormData({ ...editFormData, primaryLocationId: location.id.toString() })}
                      >
                        {editFormData.primaryLocationId === location.id.toString() ? 'Principal' : 'Hacer principal'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Usuario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a {selectedMember?.firstName} {selectedMember?.lastName}?
              Esta acción removerá al usuario de tu negocio y no podrá acceder más al sistema.
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
