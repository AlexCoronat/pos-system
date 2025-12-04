'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
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
  Archive,
  User
} from 'lucide-react'
import { BrandButton } from '@/components/shared'
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
import { TemporaryPasswordModal } from '@/components/team/TemporaryPasswordModal'
import { validateUsername } from '@/lib/utils/password-utils'

export default function TeamPage() {
  const t = useTranslations('team')
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

  // Temporary password modal state
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false)
  const [tempPasswordData, setTempPasswordData] = useState({
    username: '',
    email: '',
    temporaryPassword: '',
    isUsername: false
  })

  // Search filter
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    useEmail: true, // Toggle: true = email, false = username
    email: '',
    username: '',
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
      toast.error(error.message || t('messages.loadError'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setFormData({
      useEmail: true,
      email: '',
      username: '',
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

    // Validate based on useEmail toggle
    if (formData.useEmail) {
      if (!formData.email) {
        toast.error('El email es requerido')
        return
      }
    } else {
      if (!formData.username) {
        toast.error('El nombre de usuario es requerido')
        return
      }

      // Validate username format
      const validation = validateUsername(formData.username)
      if (!validation.valid) {
        toast.error(validation.error || 'Nombre de usuario inválido')
        return
      }
    }

    if (!formData.firstName || !formData.lastName) {
      toast.error(t('validation.requiredFields'))
      return
    }

    if (formData.locationIds.length === 0) {
      toast.error(t('validation.atLeastOneLocation'))
      return
    }

    setIsSaving(true)

    try {
      const data: CreateTeamMemberData = {
        useEmail: formData.useEmail,
        email: formData.useEmail ? formData.email : undefined,
        username: formData.useEmail ? undefined : formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        roleId: formData.roleId ? parseInt(formData.roleId) : undefined,
        locationIds: formData.locationIds,
        primaryLocationId: parseInt(formData.primaryLocationId)
      }

      const result = await teamService.addTeamMember(data)

      // Show temporary password modal
      setTempPasswordData({
        username: formData.useEmail ? formData.email : formData.username,
        email: formData.useEmail ? formData.email : '', // Email is empty for username-based accounts
        temporaryPassword: result.temporaryPassword,
        isUsername: !formData.useEmail
      })
      setShowTempPasswordModal(true)

      toast.success(t('messages.memberAdded'))
      setDialogOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || t('messages.addError'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async (member: TeamMember) => {
    if (member.isOwner) {
      toast.error(t('messages.cannotDeactivateOwner'))
      return
    }

    try {
      await teamService.toggleMemberStatus(member.id, !member.isActive)
      toast.success(member.isActive ? t('messages.userDeactivated') : t('messages.userActivated'))
      loadData()
    } catch (error: any) {
      toast.error(error.message || t('messages.statusError'))
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
      toast.error(t('validation.nameRequired'))
      return
    }

    if (editFormData.locationIds.length === 0) {
      toast.error(t('validation.atLeastOneLocation'))
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

      toast.success(t('messages.userUpdated'))
      setEditDialogOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || t('messages.updateError'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenDeleteDialog = (member: TeamMember) => {
    if (member.isOwner) {
      toast.error(t('messages.cannotDeleteOwner'))
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
      toast.success(t('messages.userDeleted'))
      setDeleteDialogOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || t('messages.deleteError'))
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

  // Filter members based on search term
  const filteredMembers = members.filter(member => {
    if (!searchTerm) return true

    const search = searchTerm.toLowerCase()
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
    const email = member.email.toLowerCase()
    const role = member.roleName.toLowerCase()

    return fullName.includes(search) ||
      email.includes(search) ||
      role.includes(search)
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings">
            <BrandButton variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </BrandButton>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/settings/team/archived">
            <BrandButton variant="outline">
              <Archive className="h-4 w-4 mr-2" />
              {t('viewArchived')}
            </BrandButton>
          </Link>
          <BrandButton onClick={handleOpenDialog}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('addUser')}
          </BrandButton>
        </div>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('stats.members')}
              </CardTitle>
              <CardDescription>
                {members.length} {members.length !== 1 ? t('stats.users') : t('stats.user')} {t('stats.inBusiness')}
              </CardDescription>
            </div>

            {/* Search Input */}
            <div className="relative w-72">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre, email o rol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? 'No se encontraron resultados' : t('empty.title')}</p>
              {!searchTerm && (
                <BrandButton className="mt-4" onClick={handleOpenDialog}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('empty.addFirst')}
                </BrandButton>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.user')}</TableHead>
                  <TableHead>{t('table.role')}</TableHead>
                  <TableHead>{t('table.locations')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>{t('table.lastAccess')}</TableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
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
                            {t('table.noLocations')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.isActive ? 'default' : 'secondary'}
                        className={member.isActive ? 'bg-green-100 text-green-800' : ''}
                      >
                        {member.isActive ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.lastLoginAt ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(member.lastLoginAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t('table.never')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <BrandButton variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </BrandButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenEditDialog(member)}
                            disabled={member.isOwner}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('actions.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(member)}
                            disabled={member.isOwner}
                          >
                            {member.isActive ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                {t('actions.deactivate')}
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('actions.activate')}
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
                            {t('actions.delete')}
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
            <DialogTitle>{t('addDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('addDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('addDialog.firstName')}</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder={t('addDialog.firstNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('addDialog.lastName')}</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder={t('addDialog.lastNamePlaceholder')}
                />
              </div>
            </div>

            {/* Email or Username Toggle */}
            <div className="space-y-3">
              <Label>Tipo de Acceso</Label>
              <div className="flex gap-2">
                <BrandButton
                  type="button"
                  variant={formData.useEmail ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setFormData({ ...formData, useEmail: true })}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </BrandButton>
                <BrandButton
                  type="button"
                  variant={!formData.useEmail ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setFormData({ ...formData, useEmail: false })}
                >
                  <User className="h-4 w-4 mr-2" />
                  Usuario
                </BrandButton>
              </div>
            </div>

            {/* Email Field (conditional) */}
            {formData.useEmail && (
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@empresa.com"
                  />
                </div>
              </div>
            )}

            {/* Username Field (conditional) */}
            {!formData.useEmail && (
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de Usuario *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    className="pl-10"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="jdoe123"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Solo letras, números, guiones y guiones bajos. Mínimo 3 caracteres.
                </p>
              </div>
            )}

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">{t('addDialog.phone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  className="pl-10"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('addDialog.phonePlaceholder')}
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>{t('addDialog.role')}</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => setFormData({ ...formData, roleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('addDialog.rolePlaceholder')} />
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
                      <BrandButton
                        type="button"
                        variant={formData.primaryLocationId === location.id.toString() ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setFormData({ ...formData, primaryLocationId: location.id.toString() })}
                      >
                        {formData.primaryLocationId === location.id.toString() ? t('addDialog.primary') : t('addDialog.makePrimary')}
                      </BrandButton>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <BrandButton type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('addDialog.cancel')}
              </BrandButton>
              <BrandButton type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('addDialog.adding')}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('addDialog.addUser')}
                  </>
                )}
              </BrandButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('editDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('editDialog.description', { name: `${selectedMember?.firstName} ${selectedMember?.lastName}` })}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">{t('addDialog.firstName')}</Label>
                <Input
                  id="edit-firstName"
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  placeholder={t('addDialog.firstNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">{t('addDialog.lastName')}</Label>
                <Input
                  id="edit-lastName"
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  placeholder={t('addDialog.lastNamePlaceholder')}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="edit-phone">{t('addDialog.phone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="edit-phone"
                  type="tel"
                  className="pl-10"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder={t('addDialog.phonePlaceholder')}
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>{t('addDialog.role')}</Label>
              <Select
                value={editFormData.roleId}
                onValueChange={(value) => setEditFormData({ ...editFormData, roleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('addDialog.rolePlaceholder')} />
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
                      <BrandButton
                        type="button"
                        variant={editFormData.primaryLocationId === location.id.toString() ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setEditFormData({ ...editFormData, primaryLocationId: location.id.toString() })}
                      >
                        {editFormData.primaryLocationId === location.id.toString() ? t('addDialog.primary') : t('addDialog.makePrimary')}
                      </BrandButton>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <BrandButton type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                {t('editDialog.cancel')}
              </BrandButton>
              <BrandButton type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('editDialog.saving')}
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t('editDialog.saveChanges')}
                  </>
                )}
              </BrandButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: `${selectedMember?.firstName} ${selectedMember?.lastName}` })}
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

      {/* Temporary Password Modal */}
      <TemporaryPasswordModal
        isOpen={showTempPasswordModal}
        onClose={() => setShowTempPasswordModal(false)}
        username={tempPasswordData.username}
        email={tempPasswordData.email}
        temporaryPassword={tempPasswordData.temporaryPassword}
        isUsername={tempPasswordData.isUsername}
      />
    </div>
  )
}
