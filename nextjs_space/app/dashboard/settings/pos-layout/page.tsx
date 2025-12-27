'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    ArrowLeft,
    Layout,
    Search,
    Grid3X3,
    Zap,
    Package,
    Briefcase,
    RotateCcw,
    Loader2,
    Eye,
    X,
    ShoppingCart
} from 'lucide-react'
import { BrandButton } from '@/components/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { usePOSLayoutConfigStore } from '@/lib/stores/pos-layout-config-store'
import { toast } from 'sonner'

export default function POSLayoutSettingsPage() {
    const {
        config,
        isLoading,
        loadConfig,
        toggleSearchBar,
        toggleCategoryFilter,
        toggleQuickProducts,
        toggleAllProducts,
        toggleServices,
        setLayoutSplit,
        resetToDefaults
    } = usePOSLayoutConfigStore()

    const [showPreview, setShowPreview] = useState(false)

    useEffect(() => {
        loadConfig()
    }, [loadConfig])

    const handleToggle = async (toggleFn: () => Promise<void>, name: string) => {
        try {
            await toggleFn()
            toast.success(`${name} actualizado`)
        } catch (error) {
            toast.error('Error al guardar configuración')
        }
    }

    const handleLayoutSplitChange = async (value: string) => {
        try {
            await setLayoutSplit(value as '50-50' | '60-40' | '70-30')
            toast.success('División de layout actualizada')
        } catch (error) {
            toast.error('Error al guardar configuración')
        }
    }

    const handleReset = async () => {
        try {
            await resetToDefaults()
            toast.success('Configuración restablecida a valores por defecto')
        } catch (error) {
            toast.error('Error al restablecer configuración')
        }
    }

    // Get layout split classes for preview
    const getPreviewLayoutClasses = () => {
        switch (config.layoutSplit) {
            case '50-50':
                return { products: 'w-1/2', cart: 'w-1/2' }
            case '60-40':
                return { products: 'w-3/5', cart: 'w-2/5' }
            case '70-30':
            default:
                return { products: 'w-[70%]', cart: 'w-[30%]' }
        }
    }

    const previewClasses = getPreviewLayoutClasses()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/settings">
                        <BrandButton variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4" />
                        </BrandButton>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Layout del Punto de Venta</h1>
                        <p className="text-sm text-gray-500">
                            Personaliza qué elementos se muestran en la pantalla de ventas
                        </p>
                    </div>
                </div>
                <BrandButton onClick={() => setShowPreview(true)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Vista Previa
                </BrandButton>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Toggle Options */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layout className="h-5 w-5" />
                            Componentes Visibles
                        </CardTitle>
                        <CardDescription>
                            Activa o desactiva los componentes que deseas mostrar en el POS
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Search Bar */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Search className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <Label className="font-medium">Barra de Búsqueda</Label>
                                    <p className="text-sm text-gray-500">Buscar productos por nombre o SKU</p>
                                </div>
                            </div>
                            <Switch
                                checked={config.showSearchBar}
                                onCheckedChange={() => handleToggle(toggleSearchBar, 'Barra de búsqueda')}
                            />
                        </div>

                        {/* Category Filter */}
                        <div className={`flex items-center justify-between ${!config.showAllProducts ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Grid3X3 className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                    <Label className="font-medium">Filtro de Categorías</Label>
                                    <p className="text-sm text-gray-500">
                                        {!config.showAllProducts
                                            ? 'Requiere "Todos los Productos" activo'
                                            : 'Tabs para filtrar por categoría'}
                                    </p>
                                </div>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>
                                            <Switch
                                                checked={config.showCategoryFilter}
                                                onCheckedChange={() => handleToggle(toggleCategoryFilter, 'Filtro de categorías')}
                                                disabled={!config.showAllProducts}
                                            />
                                        </span>
                                    </TooltipTrigger>
                                    {!config.showAllProducts && (
                                        <TooltipContent>
                                            <p>Activa primero "Todos los Productos" para habilitar este filtro</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        {/* Quick Products */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Zap className="h-4 w-4 text-yellow-600" />
                                </div>
                                <div>
                                    <Label className="font-medium">Productos Rápidos</Label>
                                    <p className="text-sm text-gray-500">Acceso rápido a productos favoritos</p>
                                </div>
                            </div>
                            <Switch
                                checked={config.showQuickProducts}
                                onCheckedChange={() => handleToggle(toggleQuickProducts, 'Productos rápidos')}
                            />
                        </div>

                        {/* All Products */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Package className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <Label className="font-medium">Todos los Productos</Label>
                                    <p className="text-sm text-gray-500">Grid con todos los productos disponibles</p>
                                </div>
                            </div>
                            <Switch
                                checked={config.showAllProducts}
                                onCheckedChange={() => handleToggle(toggleAllProducts, 'Todos los productos')}
                            />
                        </div>

                        {/* Services */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Briefcase className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                    <Label className="font-medium">Servicios</Label>
                                    <p className="text-sm text-gray-500">Mostrar sección de servicios disponibles</p>
                                </div>
                            </div>
                            <Switch
                                checked={config.showServices}
                                onCheckedChange={() => handleToggle(toggleServices, 'Servicios')}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Layout Split */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layout className="h-5 w-5" />
                            División del Layout
                        </CardTitle>
                        <CardDescription>
                            Elige cómo dividir el espacio entre productos y carrito
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={config.layoutSplit}
                            onValueChange={handleLayoutSplitChange}
                            className="space-y-4"
                        >
                            {/* 50-50 */}
                            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                <RadioGroupItem value="50-50" id="split-50-50" />
                                <Label htmlFor="split-50-50" className="flex-1 cursor-pointer">
                                    <div className="font-medium">50% / 50%</div>
                                    <p className="text-sm text-gray-500">Mitad productos, mitad carrito</p>
                                    <div className="mt-2 flex gap-1 h-6">
                                        <div className="flex-1 bg-blue-200 rounded"></div>
                                        <div className="flex-1 bg-orange-200 rounded"></div>
                                    </div>
                                </Label>
                            </div>

                            {/* 60-40 */}
                            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                <RadioGroupItem value="60-40" id="split-60-40" />
                                <Label htmlFor="split-60-40" className="flex-1 cursor-pointer">
                                    <div className="font-medium">60% / 40%</div>
                                    <p className="text-sm text-gray-500">Más espacio para productos</p>
                                    <div className="mt-2 flex gap-1 h-6">
                                        <div className="w-3/5 bg-blue-200 rounded"></div>
                                        <div className="w-2/5 bg-orange-200 rounded"></div>
                                    </div>
                                </Label>
                            </div>

                            {/* 70-30 */}
                            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                <RadioGroupItem value="70-30" id="split-70-30" />
                                <Label htmlFor="split-70-30" className="flex-1 cursor-pointer">
                                    <div className="font-medium">70% / 30%</div>
                                    <p className="text-sm text-gray-500">Máximo espacio para productos (default)</p>
                                    <div className="mt-2 flex gap-1 h-6">
                                        <div className="w-[70%] bg-blue-200 rounded"></div>
                                        <div className="w-[30%] bg-orange-200 rounded"></div>
                                    </div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>
            </div>

            {/* Reset Button */}
            <div className="flex justify-end">
                <BrandButton variant="outline" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restablecer a valores por defecto
                </BrandButton>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-[95vw] h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                            <div className="flex items-center gap-3">
                                <Eye className="h-5 w-5 text-blue-600" />
                                <h2 className="text-lg font-semibold">Vista Previa del Layout</h2>
                                <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                    División: {config.layoutSplit}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Preview Content */}
                        <div className="flex-1 flex overflow-hidden bg-gray-100">
                            {/* Products Area */}
                            <div className={`${previewClasses.products} flex flex-col border-r`}>
                                {/* Search Bar Preview */}
                                {config.showSearchBar && (
                                    <div className="p-4 bg-white border-b">
                                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-3">
                                            <Search className="h-5 w-5 text-gray-400" />
                                            <span className="text-gray-400">Buscar producto... (F2)</span>
                                        </div>
                                    </div>
                                )}

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {/* Categories Preview - only shown if products grid is also enabled */}
                                    {config.showCategoryFilter && config.showAllProducts && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Categorías</h3>
                                            <div className="flex gap-2 overflow-x-auto pb-2">
                                                {['Todos', 'Electrónica', 'Ropa', 'Hogar', 'Oficina'].map((cat) => (
                                                    <div
                                                        key={cat}
                                                        className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${cat === 'Todos' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
                                                    >
                                                        {cat}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Quick Products Preview */}
                                    {config.showQuickProducts && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                                <Zap className="h-4 w-4" />
                                                Productos Rápidos
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div key={i} className="bg-white p-3 rounded-lg border hover:shadow-md transition-shadow">
                                                        <div className="h-12 bg-gray-100 rounded mb-2 flex items-center justify-center">
                                                            <Package className="h-6 w-6 text-gray-300" />
                                                        </div>
                                                        <p className="text-sm font-medium truncate">Producto {i}</p>
                                                        <p className="text-sm text-blue-600 font-bold">$99.00</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Services Preview */}
                                    {config.showServices && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                                <Briefcase className="h-4 w-4" />
                                                Servicios Disponibles
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {['Impresión', 'Copia', 'Enmicado'].map((s) => (
                                                    <div key={s} className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                                        <Briefcase className="h-6 w-6 text-indigo-600 mb-2" />
                                                        <p className="text-sm font-medium">{s}</p>
                                                        <p className="text-xs text-gray-500">Servicio</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* All Products Preview */}
                                    {config.showAllProducts && (
                                        <div>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Todos los Productos</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                {Array.from({ length: 8 }).map((_, i) => (
                                                    <div key={i} className="bg-white p-3 rounded-lg border hover:shadow-md transition-shadow">
                                                        <div className="h-16 bg-gray-100 rounded mb-2 flex items-center justify-center">
                                                            <Package className="h-8 w-8 text-gray-300" />
                                                        </div>
                                                        <p className="text-sm font-medium truncate">Producto ejemplo {i + 1}</p>
                                                        <p className="text-xs text-gray-500">SKU-{1000 + i}</p>
                                                        <p className="text-sm text-blue-600 font-bold mt-1">${(Math.random() * 100 + 10).toFixed(2)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Empty State */}
                                    {!config.showCategoryFilter && !config.showQuickProducts && !config.showServices && !config.showAllProducts && (
                                        <div className="flex-1 flex items-center justify-center h-64">
                                            <div className="text-center text-gray-500">
                                                <Layout className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                                <p>No hay componentes visibles</p>
                                                <p className="text-sm">Activa algún componente en la configuración</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cart Area */}
                            <div className={`${previewClasses.cart} bg-white flex flex-col min-w-[300px]`}>
                                <div className="p-4 border-b">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                                        <h3 className="font-semibold">Carrito</h3>
                                        <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">2</span>
                                    </div>
                                </div>
                                <div className="flex-1 p-4 space-y-3">
                                    {/* Sample cart items */}
                                    {[1, 2].map((i) => (
                                        <div key={i} className="p-3 border rounded-lg">
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="font-medium text-sm">Producto {i}</p>
                                                    <p className="text-xs text-gray-500">SKU-000{i}</p>
                                                </div>
                                                <p className="font-bold text-sm">$99.00</p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <button className="w-6 h-6 border rounded">-</button>
                                                <span className="text-sm">1</span>
                                                <button className="w-6 h-6 border rounded">+</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t bg-gray-50">
                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                                            <span>Subtotal:</span>
                                            <span>$198.00</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>IVA:</span>
                                            <span>$31.68</span>
                                        </div>
                                        <div className="flex justify-between font-bold">
                                            <span>Total:</span>
                                            <span>$229.68</span>
                                        </div>
                                    </div>
                                    <div className="py-3 rounded-lg text-white text-center font-semibold" style={{ backgroundColor: 'var(--color-primary, #3B82F6)' }}>
                                        Pagar (F12)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

