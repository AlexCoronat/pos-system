'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  MapPin,
  Plus,
  Trash2,
  Star,
  Loader2,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { locationService } from '@/lib/services/location.service'
import type { UserWithLocations, LocationListItem } from '@/lib/types/settings'
import { toast } from 'sonner'

export default function UsersLocationsPage() {
  const [users, setUsers] = useState<UserWithLocations[]>([])
  const [locations, setLocations] = useState<LocationListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithLocations | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [usersData, locationsData] = await Promise.all([
        locationService.getUsersWithLocations(),
        locationService.getLocations()
      ])
      setUsers(usersData)
      setLocations(locationsData)
    } catch (error: any) {
      toast.error('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenAssignDialog = (user: UserWithLocations) => {
    setSelectedUser(user)
    setSelectedLocationId('')
    setDialogOpen(true)
  }

  const handleAssignLocation = async () => {
    if (!selectedUser || !selectedLocationId) return

    setIsSaving(true)
    try {
      const isPrimary = selectedUser.assignedLocations.length === 0
      await locationService.assignUserToLocation({
        userId: selectedUser.id,
        locationId: parseInt(selectedLocationId),
        isPrimary
      })
      toast.success('Ubicación asignada correctamente')
      setDialogOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al asignar ubicación')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveLocation = async (userId: string, locationId: number) => {
    try {
      await locationService.removeUserFromLocation(userId, locationId)
      toast.success('Ubicación removida')
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al remover ubicación')
    }
  }

  const handleSetPrimary = async (userId: string, locationId: number) => {
    try {
      await locationService.setUserPrimaryLocation(userId, locationId)
      toast.success('Ubicación principal actualizada')
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar ubicación principal')
    }
  }

  const getAvailableLocations = (user: UserWithLocations) => {
    const assignedIds = user.assignedLocations.map(l => l.locationId)
    return locations.filter(l => !assignedIds.includes(l.id) && l.isActive)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Usuarios y Ubicaciones</h1>
          <p className="text-muted-foreground">
            Asigna usuarios a ubicaciones y gestiona accesos
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                Cada usuario debe tener al menos una ubicación asignada para poder acceder al sistema.
                La ubicación marcada como <Star className="h-3 w-3 inline text-yellow-500" /> es la ubicación principal del usuario.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios del Sistema
          </CardTitle>
          <CardDescription>
            Gestiona las ubicaciones asignadas a cada usuario
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay usuarios registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Ubicaciones Asignadas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.roleName}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.assignedLocations.length === 0 ? (
                        <span className="text-sm text-red-600">
                          Sin ubicaciones asignadas
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {user.assignedLocations.map((ul) => (
                            <div
                              key={ul.id}
                              className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-sm"
                            >
                              {ul.isPrimary && (
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              )}
                              <MapPin className="h-3 w-3 text-gray-500" />
                              <span>{ul.location?.name || 'Ubicación'}</span>
                              <button
                                onClick={() => handleRemoveLocation(user.id, ul.locationId)}
                                className="ml-1 text-gray-400 hover:text-red-600"
                                title="Remover ubicación"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                              {!ul.isPrimary && (
                                <button
                                  onClick={() => handleSetPrimary(user.id, ul.locationId)}
                                  className="ml-1 text-gray-400 hover:text-yellow-600"
                                  title="Establecer como principal"
                                >
                                  <Star className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isActive ? 'default' : 'secondary'}
                        className={user.isActive ? 'bg-green-100 text-green-800' : ''}
                      >
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAssignDialog(user)}
                        disabled={getAvailableLocations(user).length === 0}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Asignar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Location Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Ubicación</DialogTitle>
            <DialogDescription>
              Selecciona una ubicación para asignar a {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una ubicación" />
              </SelectTrigger>
              <SelectContent>
                {selectedUser && getAvailableLocations(selectedUser).map((location) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {location.name}
                      {location.city && (
                        <span className="text-muted-foreground">
                          - {location.city}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssignLocation}
              disabled={!selectedLocationId || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Asignando...
                </>
              ) : (
                'Asignar Ubicación'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
