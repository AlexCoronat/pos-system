'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Package, History, Grid3x3, Plus } from 'lucide-react'
import { BrandButton } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { productService } from '@/lib/services/product.service'
import { inventoryService, InventoryMovement } from '@/lib/services/inventory.service'
import { VariantsList, EditVariantDialog } from '@/components/inventory/variants'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { ProductWithPrice, UpdateProductData, InventoryItem, ProductVariant } from '@/lib/types/product'

interface Category {
  id: number
  name: string
}

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const productId = parseInt(params.id as string)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [product, setProduct] = useState<ProductWithPrice | null>(null)
  const [inventory, setInventory] = useState<InventoryItem | null>(null)
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    barcode: '',
    unit: 'pieza',
    imageUrl: '',
    costPrice: '',
    salePrice: '',
    isActive: true,
    minStockLevel: '0',
    reorderPoint: '5'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load product data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Load categories
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name')
          .order('name')
        setCategories(categoriesData || [])

        // Load product
        const productData = await productService.getProductById(productId)
        setProduct(productData)

        // Set form data
        setFormData({
          sku: productData.sku,
          name: productData.name,
          description: productData.description || '',
          categoryId: productData.categoryId?.toString() || '',
          barcode: productData.barcode || '',
          unit: productData.unit || 'pieza',
          imageUrl: productData.imageUrl || '',
          costPrice: productData.price.costPrice.toString(),
          salePrice: productData.price.salePrice.toString(),
          isActive: productData.isActive,
          minStockLevel: '0',
          reorderPoint: '0'
        })

        // Load inventory
        const inventoryData = await inventoryService.getInventoryByProduct(productId, 1)
        setInventory(inventoryData)

        // Set inventory form data
        if (inventoryData) {
          setFormData(prev => ({
            ...prev,
            minStockLevel: inventoryData.minStockLevel?.toString() || '0',
            reorderPoint: inventoryData.reorderPoint?.toString() || '5'
          }))

          // Load movements
          if (inventoryData.id) {
            const movementsData = await inventoryService.getInventoryMovements(inventoryData.id)
            setMovements(movementsData)
          }
        }

        // Load variants
        const variantsData = await productService.getProductVariants(productId)
        setVariants(variantsData)
      } catch (error: any) {
        console.error('Error loading product:', error)
        toast.error('Error al cargar el producto')
        router.push('/dashboard/inventory')
      } finally {
        setIsLoading(false)
      }
    }

    if (productId) {
      loadData()
    }
  }, [productId, router])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.sku.trim()) {
      newErrors.sku = 'El SKU es requerido'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'La categoria es requerida'
    }

    if (!formData.costPrice || parseFloat(formData.costPrice) < 0) {
      newErrors.costPrice = 'El costo debe ser un numero valido'
    }

    if (!formData.salePrice || parseFloat(formData.salePrice) <= 0) {
      newErrors.salePrice = 'El precio de venta debe ser mayor a 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario')
      return
    }

    setIsSaving(true)

    try {
      // Check if SKU already exists (excluding current product)
      if (formData.sku !== product?.sku) {
        const skuExists = await productService.checkSkuExists(formData.sku, productId)
        if (skuExists) {
          setErrors({ ...errors, sku: 'Este SKU ya existe' })
          toast.error('El SKU ya esta en uso')
          setIsSaving(false)
          return
        }
      }

      // Update product
      const updateData: UpdateProductData = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        categoryId: parseInt(formData.categoryId),
        barcode: formData.barcode.trim() || undefined,
        unit: formData.unit,
        imageUrl: formData.imageUrl.trim() || undefined,
        costPrice: parseFloat(formData.costPrice),
        salePrice: parseFloat(formData.salePrice),
        isActive: formData.isActive,
        currency: 'MXN'
      }

      await productService.updateProduct(productId, updateData)

      // Update stock levels if inventory exists
      if (inventory?.id) {
        await inventoryService.updateStockLevels(
          inventory.id,
          parseInt(formData.minStockLevel) || 0,
          parseInt(formData.reorderPoint) || 5
        )
      }

      toast.success('Producto actualizado exitosamente')
      router.push('/dashboard/inventory')
    } catch (error: any) {
      console.error('Error updating product:', error)
      toast.error(error.message || 'Error al actualizar el producto')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      entry: 'Entrada',
      exit: 'Salida',
      adjustment: 'Ajuste',
      transfer: 'Transferencia'
    }
    return labels[type] || type
  }

  const getMovementTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      entry: 'bg-green-100 text-green-800',
      exit: 'bg-red-100 text-red-800',
      adjustment: 'bg-blue-100 text-blue-800',
      transfer: 'bg-purple-100 text-purple-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  // Variant management functions
  const loadVariants = async () => {
    try {
      const variantsData = await productService.getProductVariants(productId)
      setVariants(variantsData)
    } catch (error) {
      console.error('Error loading variants:', error)
      toast.error('Error al cargar variantes')
    }
  }

  const handleEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant)
    setEditDialogOpen(true)
  }

  const handleDeleteVariant = async (variantId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta variante?')) {
      return
    }

    try {
      await productService.deleteVariant(variantId)
      toast.success('Variante eliminada exitosamente')
      await loadVariants()
    } catch (error: any) {
      console.error('Error deleting variant:', error)
      toast.error(error.message || 'Error al eliminar variante')
    }
  }

  const handleToggleVariantActive = async (variantId: number, isActive: boolean) => {
    try {
      await productService.updateVariant(variantId, { isActive })
      toast.success(isActive ? 'Variante activada' : 'Variante desactivada')
      await loadVariants()
    } catch (error: any) {
      console.error('Error updating variant:', error)
      toast.error(error.message || 'Error al actualizar variante')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Cargando producto...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Producto no encontrado</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inventory">
          <BrandButton variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </BrandButton>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-muted-foreground">SKU: {product.sku}</p>
        </div>
        <Badge
          variant={product.isActive ? 'default' : 'secondary'}
          className={product.isActive ? 'bg-green-100 text-green-800' : ''}
        >
          {product.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Detalles
          </TabsTrigger>
          {variants.length > 0 && (
            <TabsTrigger value="variants" className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              Variantes ({variants.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Movimientos
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Informacion Basica</CardTitle>
                  <CardDescription>
                    Datos principales del producto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => handleChange('sku', e.target.value)}
                      className={errors.sku ? 'border-red-500' : ''}
                    />
                    {errors.sku && (
                      <p className="text-sm text-red-500">{errors.sku}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripcion</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => handleChange('categoryId', value)}
                    >
                      <SelectTrigger className={errors.categoryId ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Selecciona una categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && (
                      <p className="text-sm text-red-500">{errors.categoryId}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="barcode">Codigo de Barras</Label>
                      <Input
                        id="barcode"
                        value={formData.barcode}
                        onChange={(e) => handleChange('barcode', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit">Unidad de Medida</Label>
                      <Select
                        value={formData.unit}
                        onValueChange={(value) => handleChange('unit', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pieza">Pieza</SelectItem>
                          <SelectItem value="kg">Kilogramo</SelectItem>
                          <SelectItem value="litro">Litro</SelectItem>
                          <SelectItem value="metro">Metro</SelectItem>
                          <SelectItem value="caja">Caja</SelectItem>
                          <SelectItem value="paquete">Paquete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">URL de Imagen</Label>
                    <Input
                      id="imageUrl"
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => handleChange('imageUrl', e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Estado</Label>
                      <p className="text-sm text-muted-foreground">
                        Producto disponible para ventas
                      </p>
                    </div>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleChange('isActive', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pricing and Inventory Info */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Precios</CardTitle>
                    <CardDescription>
                      Configura los precios del producto
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="costPrice">Precio de Costo *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="costPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.costPrice}
                          onChange={(e) => handleChange('costPrice', e.target.value)}
                          className={`pl-7 ${errors.costPrice ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.costPrice && (
                        <p className="text-sm text-red-500">{errors.costPrice}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="salePrice">Precio de Venta *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="salePrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.salePrice}
                          onChange={(e) => handleChange('salePrice', e.target.value)}
                          className={`pl-7 ${errors.salePrice ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.salePrice && (
                        <p className="text-sm text-red-500">{errors.salePrice}</p>
                      )}
                    </div>

                    {formData.costPrice && formData.salePrice && parseFloat(formData.salePrice) > parseFloat(formData.costPrice) && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700">
                          Margen de ganancia: {' '}
                          <span className="font-semibold">
                            {(((parseFloat(formData.salePrice) - parseFloat(formData.costPrice)) / parseFloat(formData.costPrice)) * 100).toFixed(1)}%
                          </span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Estado del Inventario</CardTitle>
                    <CardDescription>
                      Informacion actual del stock
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {inventory ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Cantidad disponible</span>
                          <span className="font-semibold text-lg">{inventory.quantity}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="minStockLevel">Stock mínimo</Label>
                            <Input
                              id="minStockLevel"
                              type="number"
                              min="0"
                              value={formData.minStockLevel}
                              onChange={(e) => handleChange('minStockLevel', e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reorderPoint">Punto de reorden</Label>
                            <Input
                              id="reorderPoint"
                              type="number"
                              min="0"
                              value={formData.reorderPoint}
                              onChange={(e) => handleChange('reorderPoint', e.target.value)}
                            />
                          </div>
                        </div>

                        {inventory.lastRestocked && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Último reabastecimiento</span>
                            <span>{formatDate(inventory.lastRestocked)}</span>
                          </div>
                        )}

                        <div className="pt-2">
                          {inventory.quantity <= 0 ? (
                            <Badge variant="destructive">Sin Stock</Badge>
                          ) : inventory.quantity <= (parseInt(formData.reorderPoint) || 0) ? (
                            <Badge className="bg-yellow-100 text-yellow-800">Bajo Stock</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Stock Normal</Badge>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No hay registro de inventario para este producto
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/dashboard/inventory">
                <BrandButton type="button" variant="outline">
                  Cancelar
                </BrandButton>
              </Link>
              <BrandButton type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </BrandButton>
            </div>
          </form>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
              <CardDescription>
                Registro de todas las entradas y salidas del inventario
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No hay movimientos registrados
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="text-sm">
                            {formatDate(movement.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getMovementTypeColor(movement.movementType)}>
                              {getMovementTypeLabel(movement.movementType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {movement.movementType === 'entry' ? '+' : '-'}
                            {movement.quantity}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {movement.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Variants Tab */}
        <TabsContent value="variants">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Variantes del Producto</CardTitle>
                  <CardDescription>
                    Gestiona las diferentes variantes de este producto
                  </CardDescription>
                </div>
                <Button
                  onClick={() => router.push(`/dashboard/inventory/products/new?cloneFrom=${productId}`)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Variante
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <VariantsList
                variants={variants}
                onEdit={handleEditVariant}
                onDelete={handleDeleteVariant}
                onToggleActive={handleToggleVariantActive}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Variant Dialog */}
      <EditVariantDialog
        open={editDialogOpen}
        variant={editingVariant}
        onOpenChange={setEditDialogOpen}
        onSuccess={loadVariants}
      />
    </div>
  )
}
