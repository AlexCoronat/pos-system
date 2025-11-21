'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
      toast.error('Error al cargar ubicaciones')
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
        toast.error('Error al cargar ubicación')
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
      toast.error('El nombre es requerido')
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
        toast.success('Ubicación actualizada')
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
        toast.success('Ubicación creada')
      }

      setDialogOpen(false)
      resetForm()
      loadLocations()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar ubicación')
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
      toast.success('Ubicación eliminada')
      loadLocations()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar ubicación')
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
            <h1 className="text-3xl font-bold">Ubicaciones</h1>
            <p className="text-muted-foreground">
              Gestiona las sucursales y puntos de venta
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Ubicacion
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
              <p>No hay ubicaciones registradas</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Ubicacion
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead className="text-center">Usuarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
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
                        {location.isActive ? 'Activa' : 'Inactiva'}
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
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteClick(location)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Editar Ubicacion' : 'Nueva Ubicacion'}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? 'Modifica los datos de la ubicación'
                : 'Completa los datos para crear una nueva ubicación'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Sucursal Centro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Codigo</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUC-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Direccion</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Calle, numero, colonia"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ciudad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Estado"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Codigo Postal</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Pais</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sucursal@empresa.com"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label>Estado</Label>
                <p className="text-sm text-muted-foreground">
                  Ubicacion activa en el sistema
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
                    <Save className="h-4 w-4 mr-2" />
                    {editingLocation ? 'Guardar Cambios' : 'Crear Ubicacion'}
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
            <AlertDialogTitle>Eliminar Ubicacion</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de que deseas eliminar la ubicación "{locationToDelete?.name}"?
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
