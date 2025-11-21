'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, FolderTree } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { productService, type Category, type CreateCategoryData } from '@/lib/services/product.service'
import { toast } from 'sonner'

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategoryCreated?: () => void
}

export function CategoryDialog({ open, onOpenChange, onCategoryCreated }: CategoryDialogProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<CreateCategoryData>({
    name: '',
    description: '',
    icon: '',
    displayOrder: 0,
    isActive: true
  })

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  const loadCategories = async () => {
    setIsLoading(true)
    try {
      const data = await productService.getCategories()
      setCategories(data)
    } catch (error: any) {
      console.error('Error loading categories:', error)
      toast.error('Error al cargar categorías')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadCategories()
      resetForm()
    }
  }, [open])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: '',
      displayOrder: 0,
      isActive: true
    })
    setIsEditing(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setIsSaving(true)
    try {
      if (isEditing && editingId) {
        await productService.updateCategory(editingId, formData)
        toast.success('Categoría actualizada')
      } else {
        await productService.createCategory(formData)
        toast.success('Categoría creada')
      }

      await loadCategories()
      resetForm()
      onCategoryCreated?.()
    } catch (error: any) {
      console.error('Error saving category:', error)
      toast.error(error.message || 'Error al guardar categoría')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      displayOrder: category.displayOrder,
      isActive: category.isActive
    })
    setEditingId(category.id)
    setIsEditing(true)
  }

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return

    setIsDeleting(true)
    try {
      await productService.deleteCategory(categoryToDelete.id)
      toast.success('Categoría eliminada')
      await loadCategories()
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    } catch (error: any) {
      console.error('Error deleting category:', error)
      toast.error(error.message || 'Error al eliminar categoría')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Gestión de Categorías
            </DialogTitle>
            <DialogDescription>
              Crea y administra las categorías de productos para tu negocio.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">
                {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Bebidas"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción de la categoría..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="icon">Icono</Label>
                    <Input
                      id="icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="Ej: coffee"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayOrder">Orden</Label>
                    <Input
                      id="displayOrder"
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSaving} className="flex-1">
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : isEditing ? (
                      <Pencil className="h-4 w-4 mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
                  </Button>

                  {isEditing && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Categories List */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">
                Categorías Existentes ({categories.length})
              </h3>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderTree className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay categorías creadas</p>
                  <p className="text-sm">Crea tu primera categoría</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-center">Orden</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{category.name}</p>
                              {category.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {category.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{category.displayOrder}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(category)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteClick(category)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la categoría "{categoryToDelete?.name}".
              No se puede eliminar si tiene productos asignados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
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
    </>
  )
}
