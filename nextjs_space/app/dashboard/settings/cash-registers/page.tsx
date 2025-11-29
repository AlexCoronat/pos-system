'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CreditCard, Plus, Pencil, Trash2, ArrowLeft, Loader2,
  MapPin, Check, X, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { toast } from 'sonner'
import { cashRegisterService, type CashRegister, type CreateCashRegisterData } from '@/lib/services/cash-register.service'

export default function CashRegistersPage() {
  const router = useRouter()
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    location_id: '',
    is_main: false
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [registersData, locationsData] = await Promise.all([
        cashRegisterService.getCashRegisters(),
        loadLocations()
      ])
      setCashRegisters(registersData)
      setLocations(locationsData)
    } catch (error: any) {
      toast.error('Error al cargar los datos')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadLocations = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      
      const { data: userData } = await supabase
        .from('user_details')
        .select('business_id')
        .eq('id', user.id)
        .single()
      
      if (!userData?.business_id) return []
      
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('business_id', userData.business_id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error loading locations:', error)
      return []
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      location_id: '',
      is_main: false
    })
  }

  const openCreateDialog = () => {
    resetForm()
    setIsCreateOpen(true)
  }

  const openEditDialog = (register: CashRegister) => {
    setSelectedRegister(register)
    setFormData({
      name: register.name,
      code: register.code,
      description: register.description || '',
      location_id: register.location_id?.toString() || '',
      is_main: register.is_main
    })
    setIsEditOpen(true)
  }

  const openDeleteDialog = (register: CashRegister) => {
    setSelectedRegister(register)
    setIsDeleteOpen(true)
  }

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.code.trim() || !formData.location_id) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    try {
      setIsSaving(true)
      const data: CreateCashRegisterData = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim() || undefined,
        location_id: parseInt(formData.location_id),
        is_main: formData.is_main
      }

      await cashRegisterService.createCashRegister(data)
      toast.success('Caja registradora creada exitosamente')
      setIsCreateOpen(false)
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la caja')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedRegister) return

    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    try {
      setIsSaving(true)
      await cashRegisterService.updateCashRegister(selectedRegister.id, {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim() || undefined,
        location_id: formData.location_id ? parseInt(formData.location_id) : undefined,
        is_main: formData.is_main
      })
      toast.success('Caja actualizada exitosamente')
      setIsEditOpen(false)
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar la caja')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRegister) return

    try {
      setIsSaving(true)
      await cashRegisterService.deleteCashRegister(selectedRegister.id)
      toast.success('Caja desactivada exitosamente')
      setIsDeleteOpen(false)
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al desactivar la caja')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CreditCard className="h-8 w-8" />
              Cajas Registradoras
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Gestiona las cajas registradoras de tu negocio
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Caja
        </Button>
      </div>

      {cashRegisters.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay cajas registradoras</h3>
          <p className="text-muted-foreground mb-4">
            Crea tu primera caja registradora para empezar a operar el POS
          </p>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Primera Caja
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cashRegisters.map((register) => (
            <Card key={register.id} className={!register.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {register.name}
                      {register.is_main && (
                        <Badge variant="default">Principal</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {register.location?.name || 'Sin ubicación'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(register)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(register)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Código:</span>
                    <span className="ml-2 font-mono">{register.code}</span>
                  </div>
                  {register.description && (
                    <div>
                      <span className="text-muted-foreground">{register.description}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <Badge variant={register.is_active ? 'default' : 'secondary'}>
                      {register.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nueva Caja Registradora</DialogTitle>
            <DialogDescription>
              Crea una nueva caja para tu punto de venta
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Ej: Caja Principal, Caja 1"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                placeholder="Ej: CAJA-001"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Ubicación *</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, location_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {locations.length === 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Primero debes crear una ubicación
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción opcional..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Caja Principal</Label>
                <p className="text-xs text-muted-foreground">
                  Marcar como caja principal del sistema
                </p>
              </div>
              <Switch
                checked={formData.is_main}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_main: checked }))}
              />
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
                  Crear Caja
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Caja Registradora</DialogTitle>
            <DialogDescription>
              Modifica la información de la caja
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                placeholder="Ej: Caja Principal"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-code">Código *</Label>
              <Input
                id="edit-code"
                placeholder="Ej: CAJA-001"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location">Ubicación</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, location_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                placeholder="Descripción opcional..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Caja Principal</Label>
                <p className="text-xs text-muted-foreground">
                  Marcar como caja principal del sistema
                </p>
              </div>
              <Switch
                checked={formData.is_main}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_main: checked }))}
              />
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
                  <Check className="h-4w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar caja registradora?</AlertDialogTitle>
            <AlertDialogDescription>
              La caja "{selectedRegister?.name}" será desactivada. Los turnos existentes no serán afectados.
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
                  Desactivando...
                </>
              ) : (
                'Desactivar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
