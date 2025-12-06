'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  Package,
  AlertTriangle,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown,
  MoreHorizontal,
  FolderTree,
  PackageCheck,
  PackageX
} from 'lucide-react'
import { StatsCard, PageHeader, LoadingState, EmptyState, BrandButton } from '@/components/shared'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { productService, ProductFilters } from '@/lib/services/product.service'
import { inventoryService, InventoryWithProduct } from '@/lib/services/inventory.service'
import { locationService } from '@/lib/services/location.service'
import { StockAdjustmentDialog } from '@/components/inventory/stock-adjustment-dialog'
import { CategoryDialog } from '@/components/inventory/category-dialog'
import type { ProductWithPrice } from '@/lib/types/product'
import type { LocationListItem } from '@/lib/types/settings'
import { toast } from 'sonner'
import { MapPin } from 'lucide-react'

export default function InventoryPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('products')

  // Products state
  const [products, setProducts] = useState<ProductWithPrice[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const pageSize = 20

  // Inventory state
  const [inventory, setInventory] = useState<InventoryWithProduct[]>([])
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)
  const [lowStockItems, setLowStockItems] = useState<InventoryWithProduct[]>([])

  // Location filter state
  const [locations, setLocations] = useState<LocationListItem[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined)
  const [isLoadingLocations, setIsLoadingLocations] = useState(true)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<ProductWithPrice | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Stock adjustment dialog state
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryWithProduct | null>(null)

  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const loadProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const filters: ProductFilters = {}

      if (searchTerm) {
        filters.searchTerm = searchTerm
      }

      if (statusFilter !== 'all') {
        filters.isActive = statusFilter === 'active'
      }

      const response = await productService.getProducts(filters, currentPage, pageSize)
      setProducts(response.products)
      setTotalPages(response.totalPages)
      setTotalProducts(response.total)
    } catch (error: any) {
      console.error('Error loading products:', error)
      toast.error('Error al cargar los productos')
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const loadLocations = async () => {
    setIsLoadingLocations(true)
    try {
      const locs = await locationService.getLocations()
      setLocations(locs)
      // Set default location if available
      if (locs.length > 0 && selectedLocationId === undefined) {
        setSelectedLocationId(locs[0].id)
      }
    } catch (error: any) {
      console.error('Error loading locations:', error)
      toast.error('Error al cargar las sucursales')
    } finally {
      setIsLoadingLocations(false)
    }
  }

  const loadInventory = async (locationId?: number) => {
    setIsLoadingInventory(true)
    try {
      // Load inventory for selected location or all if undefined
      const inventoryData = await inventoryService.getInventory({
        locationId: locationId
      })
      setInventory(inventoryData)

      // Load low stock alerts for selected location
      const lowStock = await inventoryService.getLowStockAlerts(locationId)
      setLowStockItems(lowStock)
    } catch (error: any) {
      console.error('Error loading inventory:', error)
      toast.error('Error al cargar el inventario')
    } finally {
      setIsLoadingInventory(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [currentPage, statusFilter])

  useEffect(() => {
    loadLocations()
  }, [])

  useEffect(() => {
    if (activeTab === 'stock' || activeTab === 'alerts') {
      loadInventory(selectedLocationId)
    }
  }, [activeTab, selectedLocationId])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    loadProducts()
  }

  const handleDeleteClick = (product: ProductWithPrice) => {
    setProductToDelete(product)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return

    setIsDeleting(true)
    try {
      await productService.deleteProduct(productToDelete.id)
      toast.success('Producto eliminado correctamente')
      loadProducts()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el producto')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const handleAdjustStock = (item: InventoryWithProduct) => {
    setSelectedInventoryItem(item)
    setAdjustmentDialogOpen(true)
  }

  const handleAdjustmentSuccess = () => {
    loadInventory()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Inventario"
        subtitle="Gestiona productos y controla el stock de tu negocio"
        actions={
          <>
            <BrandButton
              variant="outline"
              size="lg"
              onClick={() => setCategoryDialogOpen(true)}
            >
              <FolderTree className="h-5 w-5 mr-2" />
              Categorías
            </BrandButton>
            <Link href="/dashboard/inventory/products/new">
              <BrandButton size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Nuevo Producto
              </BrandButton>
            </Link>
          </>
        }
      />


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Productos"
          value={totalProducts}
          icon={Package}
          color="blue"
        />
        <StatsCard
          title="Productos Activos"
          value={products.filter(p => p.isActive).length}
          icon={PackageCheck}
          color="emerald"
        />
        <StatsCard
          title="Bajo Stock"
          value={lowStockItems.length}
          icon={AlertTriangle}
          color="yellow"
        />
        <StatsCard
          title="Sin Stock"
          value={inventory.filter(i => i.quantity <= 0).length}
          icon={PackageX}
          color="red"
        />
      </div>


      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas
            {lowStockItems.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {lowStockItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>

                <BrandButton type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </BrandButton>

                <BrandButton
                  type="button"
                  variant="outline"
                  onClick={loadProducts}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </BrandButton>
              </form>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardContent className="p-0">
              {isLoadingProducts ? (
                <LoadingState message="Cargando productos..." />
              ) : products.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No se encontraron productos"
                  description="Comienza agregando tu primer producto al inventario"
                  action={
                    <Link href="/dashboard/inventory/products/new">
                      <BrandButton>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Producto
                      </BrandButton>
                    </Link>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Costo</TableHead>
                        <TableHead className="text-right">Precio Venta</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono text-sm">
                            {product.sku}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.categoryName || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(product.price.costPrice)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(product.price.salePrice)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={product.isActive ? 'default' : 'secondary'}
                              className={product.isActive ? 'bg-green-100 text-green-800' : ''}
                            >
                              {product.isActive ? 'Activo' : 'Inactivo'}
                            </Badge>
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
                                  onClick={() => router.push(`/dashboard/inventory/products/${product.id}`)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Ver / Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteClick(product)}
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
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Pagina {currentPage} de {totalPages} ({totalProducts} productos en total)
                  </div>
                  <div className="flex gap-2">
                    <BrandButton
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </BrandButton>
                    <BrandButton
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </BrandButton>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Niveles de Stock</CardTitle>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedLocationId?.toString() || 'all'}
                  onValueChange={(val) => setSelectedLocationId(val === 'all' ? undefined : parseInt(val))}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id.toString()}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingInventory ? (
                <LoadingState message="Cargando inventario..." />
              ) : inventory.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No hay registros de inventario"
                  description="El inventario se creará automáticamente al agregar productos"
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Variante</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Min. Stock</TableHead>
                        <TableHead className="text-right">Punto Reorden</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.productSku}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.productName}
                          </TableCell>
                          <TableCell>
                            {item.variantName || '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.minStockLevel}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.reorderPoint}
                          </TableCell>
                          <TableCell>
                            {item.quantity <= 0 ? (
                              <Badge variant="destructive">Sin Stock</Badge>
                            ) : item.quantity <= item.reorderPoint ? (
                              <Badge className="bg-yellow-100 text-yellow-800">Bajo Stock</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">Normal</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <BrandButton
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAdjustStock(item)}
                            >
                              Ajustar
                            </BrandButton>
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

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Productos con Bajo Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingInventory ? (
                <LoadingState message="Cargando alertas..." />
              ) : lowStockItems.length === 0 ? (
                <EmptyState
                  icon={PackageCheck}
                  title="¡Todo en orden!"
                  description="No hay productos con bajo stock en este momento"
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad Actual</TableHead>
                        <TableHead className="text-right">Punto Reorden</TableHead>
                        <TableHead className="text-right">Faltante</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.productSku}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.productName}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.reorderPoint}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.reorderPoint - item.quantity}
                          </TableCell>
                          <TableCell>
                            <BrandButton
                              size="sm"
                              variant="outline"
                              onClick={() => handleAdjustStock(item)}
                            >
                              Reabastecer
                            </BrandButton>
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
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Producto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de que deseas eliminar el producto "{productToDelete?.name}"?
              Esta accion desactivara el producto y no podra ser utilizado en nuevas ventas.
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

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        inventoryItem={selectedInventoryItem}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* Category Management Dialog */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onCategoryCreated={loadProducts}
      />
    </div>
  )
}
