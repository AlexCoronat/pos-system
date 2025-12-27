'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, RefreshCw, Wand2, Plus, Briefcase, Clock, Calendar } from 'lucide-react'
import { BrandButton } from '@/components/shared'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { productService } from '@/lib/services/product.service'
import { inventoryService } from '@/lib/services/inventory.service'
import { CategoryDialog } from '@/components/inventory/category-dialog'
import { ProductVariantsSection } from '@/components/inventory/variants'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { CreateProductData, CreateVariantData } from '@/lib/types/product'

interface Category {
  id: number
  name: string
}

export default function NewProductPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [isGeneratingSKU, setIsGeneratingSKU] = useState(false)
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)

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
    initialStock: '0',
    minStockLevel: '0',
    reorderPoint: '5',
    hasVariants: false,
    // Service fields
    isService: false,
    durationMinutes: '',
    requiresAppointment: false
  })

  // Variant state
  const [variants, setVariants] = useState<CreateVariantData[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load categories
  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  // Load categories and generate initial barcode
  useEffect(() => {
    const initialize = async () => {
      await loadCategories()

      // Generate initial barcode
      try {
        const barcode = await productService.generateSuggestedBarcode()
        setFormData(prev => ({ ...prev, barcode }))
      } catch (error) {
        console.error('Error generating barcode:', error)
      }
    }

    initialize()
  }, [])

  // Generate SKU when category changes
  const handleCategoryChange = async (categoryId: string) => {
    setFormData(prev => ({ ...prev, categoryId }))

    if (errors.categoryId) {
      setErrors(prev => ({ ...prev, categoryId: '' }))
    }

    if (categoryId) {
      setIsGeneratingSKU(true)
      try {
        const category = categories.find(c => c.id.toString() === categoryId)
        const sku = await productService.generateNextSKU(category?.name || '')
        setFormData(prev => ({ ...prev, sku }))
      } catch (error) {
        console.error('Error generating SKU:', error)
      } finally {
        setIsGeneratingSKU(false)
      }
    }
  }

  // Regenerate SKU
  const handleRegenerateSKU = async () => {
    if (!formData.categoryId) {
      toast.error('Selecciona una categoría primero')
      return
    }

    setIsGeneratingSKU(true)
    try {
      const category = categories.find(c => c.id.toString() === formData.categoryId)
      const sku = await productService.generateNextSKU(category?.name || '', true)
      setFormData(prev => ({ ...prev, sku }))
    } catch (error) {
      console.error('Error regenerating SKU:', error)
    } finally {
      setIsGeneratingSKU(false)
    }
  }

  // Regenerate barcode
  const handleRegenerateBarcode = async () => {
    setIsGeneratingBarcode(true)
    try {
      const barcode = await productService.generateSuggestedBarcode(true)
      setFormData(prev => ({ ...prev, barcode }))
    } catch (error) {
      console.error('Error regenerating barcode:', error)
    } finally {
      setIsGeneratingBarcode(false)
    }
  }

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

    if (parseFloat(formData.salePrice) < parseFloat(formData.costPrice)) {
      newErrors.salePrice = 'El precio de venta debe ser mayor o igual al costo'
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

    setIsLoading(true)

    try {
      // Check if SKU already exists
      const skuExists = await productService.checkSkuExists(formData.sku)
      if (skuExists) {
        setErrors({ ...errors, sku: 'Este SKU ya existe' })
        toast.error('El SKU ya esta en uso')
        setIsLoading(false)
        return
      }

      // Create product
      const productData: CreateProductData = {
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
        currency: 'MXN',
        hasVariants: formData.hasVariants,
        variants: formData.hasVariants ? variants : undefined,
        // Service fields
        isService: formData.isService,
        durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : undefined,
        requiresAppointment: formData.requiresAppointment
      }

      const product = await productService.createProduct(productData)

      // Only create inventory if NOT a service
      if (!formData.isService) {
        const initialStock = parseInt(formData.initialStock) || 0
        await inventoryService.adjustInventory({
          productId: product.id,
          locationId: 1, // Default location
          quantity: initialStock,
          movementType: initialStock > 0 ? 'entry' : 'adjustment',
          notes: initialStock > 0 ? 'Stock inicial al crear producto' : 'Registro de inventario inicial'
        })

        // Update stock levels
        const inventory = await inventoryService.getInventoryByProduct(product.id, 1)
        if (inventory) {
          await inventoryService.updateStockLevels(
            inventory.id!,
            parseInt(formData.minStockLevel) || 0,
            parseInt(formData.reorderPoint) || 5
          )
        }
      } // End of if (!formData.isService)

      toast.success('Producto creado exitosamente')
      router.push('/dashboard/inventory')
    } catch (error: any) {
      console.error('Error creating product:', error)
      toast.error(error.message || 'Error al crear el producto')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inventory">
          <BrandButton variant="ghost" size="sm">
            <ArrowLeft className="h-5 w-5" />
          </BrandButton>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Producto</h1>
          <p className="text-muted-foreground">
            Agrega un nuevo producto al inventario
          </p>
        </div>
      </div>

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
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Nombre del producto"
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
                  placeholder="Descripcion del producto..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.categoryId}
                    onValueChange={handleCategoryChange}
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <BrandButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCategoryDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </BrandButton>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Crear nueva categoría si no existe en la lista</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {errors.categoryId && (
                  <p className="text-sm text-red-500">{errors.categoryId}</p>
                )}
                {isGeneratingSKU && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Generando SKU...
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <div className="flex gap-2">
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleChange('sku', e.target.value)}
                    placeholder="Se genera al seleccionar categoría"
                    className={errors.sku ? 'border-red-500' : ''}
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <BrandButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRegenerateSKU}
                          disabled={isGeneratingSKU || !formData.categoryId}
                        >
                          {isGeneratingSKU ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </BrandButton>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {!formData.categoryId
                            ? 'Selecciona una categoría primero'
                            : 'Generar nuevo código SKU basado en la categoría'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {formData.sku && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Wand2 className="h-3 w-3" />
                    Auto-generado (editable)
                  </p>
                )}
                {errors.sku && (
                  <p className="text-sm text-red-500">{errors.sku}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Codigo de Barras</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => handleChange('barcode', e.target.value)}
                    placeholder="EAN-13"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <BrandButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRegenerateBarcode}
                          disabled={isGeneratingBarcode}
                        >
                          {isGeneratingBarcode ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </BrandButton>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Generar nuevo código de barras interno</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {formData.barcode && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Wand2 className="h-3 w-3" />
                    Auto-generado (editable)
                  </p>
                )}
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

              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL de Imagen</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => handleChange('imageUrl', e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
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

          {/* Pricing and Inventory */}
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
                      placeholder="0.00"
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
                      placeholder="0.00"
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

            {/* Service Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Tipo de Producto
                </CardTitle>
                <CardDescription>
                  Define si es un producto físico o un servicio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-indigo-600" />
                    <div>
                      <Label className="font-medium">¿Es un servicio?</Label>
                      <p className="text-sm text-muted-foreground">
                        Los servicios no manejan inventario
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.isService}
                    onCheckedChange={(checked) => handleChange('isService', checked)}
                  />
                </div>

                {formData.isService && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="durationMinutes">Duración (minutos)</Label>
                      </div>
                      <Input
                        id="durationMinutes"
                        type="number"
                        min="0"
                        value={formData.durationMinutes}
                        onChange={(e) => handleChange('durationMinutes', e.target.value)}
                        placeholder="Ej: 30 (opcional)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Tiempo estimado del servicio (opcional)
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-orange-600" />
                        <div>
                          <Label className="font-medium">¿Requiere cita?</Label>
                          <p className="text-sm text-muted-foreground">
                            El cliente debe agendar previamente
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.requiresAppointment}
                        onCheckedChange={(checked) => handleChange('requiresAppointment', checked)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Inventory - Hidden for services */}
            {!formData.isService && (
              <Card>
                <CardHeader>
                  <CardTitle>Inventario Inicial</CardTitle>
                  <CardDescription>
                    Configura el stock inicial del producto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="initialStock">Cantidad Inicial</Label>
                    <Input
                      id="initialStock"
                      type="number"
                      min="0"
                      value={formData.initialStock}
                      onChange={(e) => handleChange('initialStock', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minStockLevel">Stock Minimo</Label>
                      <Input
                        id="minStockLevel"
                        type="number"
                        min="0"
                        value={formData.minStockLevel}
                        onChange={(e) => handleChange('minStockLevel', e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="reorderPoint">Punto de Reorden</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M12 16v-4" />
                                  <path d="M12 8h.01" />
                                </svg>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">¿Qué es el Punto de Reorden?</p>
                              <p className="text-sm">
                                Es el nivel mínimo de stock que indica cuándo debes hacer un nuevo pedido.
                                Cuando el inventario llegue a esta cantidad, recibirás una alerta para reabastecer
                                el producto antes de quedarte sin existencias.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="reorderPoint"
                        type="number"
                        min="0"
                        value={formData.reorderPoint}
                        onChange={(e) => handleChange('reorderPoint', e.target.value)}
                        placeholder="5"
                      />
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Se generara una alerta cuando el stock sea menor o igual al punto de reorden.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Product Variants Section */}
        <ProductVariantsSection
          enabled={formData.hasVariants}
          productSku={formData.sku}
          productPrice={parseFloat(formData.salePrice) || 0}
          variants={variants}
          onToggle={(enabled) => handleChange('hasVariants', enabled)}
          onChange={setVariants}
        />

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/inventory">
            <BrandButton type="button" variant="outline">
              Cancelar
            </BrandButton>
          </Link>
          <BrandButton type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Producto
              </>
            )}
          </BrandButton>
        </div>
      </form>

      {/* Category Dialog */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onCategoryCreated={loadCategories}
      />
    </div>
  )
}
