'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Users,
  MoreHorizontal,
  Loader2,
  Save,
  X
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
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { locationService } from '@/lib/services/location.service'
import type { LocationListItem, CreateLocationData, Location } from '@/lib/types/settings'
import { toast } from 'sonner'

export default function LocationsPage() {
  const t = useTranslations('locations')
  const [locations, setLocations] = useState<LocationListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<LocationListItem | null>(null)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Mexico',
    phone: '',
    email: '',
    isActive: true
  })

  const loadLocations = async () => {
    setIsLoading(true)
    try {
      const data = await locationService.getLocations()
      setLocations(data)
    } catch (error: any) {
      toast.error(t('messages.loadError'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLocations()
  }, [])

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Mexico',
      phone: '',
      email: '',
      isActive: true
    })
    setEditingLocation(null)
  }

  const handleOpenDialog = async (location?: LocationListItem) => {
    if (location) {
      try {
        const fullLocation = await locationService.getLocationById(location.id)
        setEditingLocation(fullLocation)
        setFormData({
          name: fullLocation.name,
          code: fullLocation.code || '',
          address: fullLocation.address || '',
          city: fullLocation.city || '',
          state: fullLocation.state || '',
          postalCode: fullLocation.postalCode || '',
          country: fullLocation.country || 'Mexico',
          phone: fullLocation.phone || '',
          email: fullLocation.email || '',
          isActive: fullLocation.isActive
        })
      } catch (error) {
        toast.error(t('messages.loadError'))
        return
      }
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error(t('messages.nameRequired'))
      return
    }

    setIsSaving(true)

    try {
      if (editingLocation) {
        await locationService.updateLocation(editingLocation.id, {
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          address: formData.address.trim() || undefined,
          city: formData.city.trim() || undefined,
          state: formData.state.trim() || undefined,
          postalCode: formData.postalCode.trim() || undefined,
          country: formData.country.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          isActive: formData.isActive
        })
        toast.success(t('messages.locationUpdated'))
      } else {
        await locationService.createLocation({
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          address: formData.address.trim() || undefined,
          city: formData.city.trim() || undefined,
          state: formData.state.trim() || undefined,
          postalCode: formData.postalCode.trim() || undefined,
          country: formData.country.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          isActive: formData.isActive
        })
        toast.success(t('messages.locationCreated'))
      }

      setDialogOpen(false)
      resetForm()
      loadLocations()
    } catch (error: any) {
      toast.error(error.message || t('messages.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (location: LocationListItem) => {
    setLocationToDelete(location)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!locationToDelete) return

    setIsDeleting(true)
    try {
      await locationService.deleteLocation(locationToDelete.id)
      toast.success(t('messages.locationDeleted'))
      loadLocations()
    } catch (error: any) {
      toast.error(error.message || t('messages.deleteError'))
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setLocationToDelete(null)
    }
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
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('newLocation')}
        </Button>
      </div>

      {/* Locations Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : locations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('empty.title')}</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {t('empty.create')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.name')}</TableHead>
                  <TableHead>{t('table.code')}</TableHead>
                  <TableHead>{t('table.city')}</TableHead>
                  <TableHead>{t('table.phone')}</TableHead>
                  <TableHead className="text-center">{t('table.users')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="font-medium">{location.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{location.code || '-'}</TableCell>
                    <TableCell>
                      {location.city ? (
                        <span>
                          {location.city}
                          {location.state && `, ${location.state}`}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {location.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {location.phone}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {location.userCount || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.isActive ? 'default' : 'secondary'}>
                        {location.isActive ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(location)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('actions.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteClick(location)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? t('dialog.editTitle') : t('dialog.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? t('dialog.editDescription')
                : t('dialog.createDescription')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('dialog.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('dialog.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">{t('dialog.code')}</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder={t('dialog.codePlaceholder')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('dialog.address')}</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('dialog.addressPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">{t('dialog.city')}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder={t('dialog.cityPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">{t('dialog.state')}</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder={t('dialog.statePlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">{t('dialog.postalCode')}</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder={t('dialog.postalCodePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">{t('dialog.country')}</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('dialog.phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('dialog.phonePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('dialog.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('dialog.emailPlaceholder')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label>{t('dialog.status')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('dialog.statusHelp')}
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('dialog.cancel')}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('dialog.saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingLocation ? t('dialog.save') : t('dialog.create')}
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
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: locationToDelete?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? t('deleteDialog.deleting') : t('deleteDialog.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
