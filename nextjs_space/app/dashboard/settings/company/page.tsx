'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Building2,
    ArrowLeft,
    Save,
    Upload,
    Palette,
    Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { companyService, type CompanyInfo } from '@/lib/services/company.service'
import { locationService } from '@/lib/services/location.service'
import type { Location, LocationListItem } from '@/lib/types/settings'
import { LocationsTab } from '@/components/settings/LocationsTab'

export default function CompanySettingsPage() {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
    const [activeTab, setActiveTab] = useState('info')

    // Locations state
    const [locations, setLocations] = useState<LocationListItem[]>([])
    const [isLoadingLocations, setIsLoadingLocations] = useState(false)
    const [locationDialogOpen, setLocationDialogOpen] = useState(false)
    const [deleteLocationDialogOpen, setDeleteLocationDialogOpen] = useState(false)
    const [editingLocation, setEditingLocation] = useState<Location | null>(null)
    const [locationToDelete, setLocationToDelete] = useState<LocationListItem | null>(null)
    const [isDeletingLocation, setIsDeletingLocation] = useState(false)

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        legalName: '',
        taxId: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Mexico',
        timezone: 'America/Mexico_City',
        currency: 'MXN'
    })

    const [branding, setBranding] = useState({
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        slogan: ''
    })

    const [legal, setLegal] = useState({
        terms: '',
        returnPolicy: '',
        invoiceNotes: ''
    })

    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    // Location form state
    const [locationFormData, setLocationFormData] = useState({
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

    useEffect(() => {
        loadCompanyInfo()
        loadLocations()
    }, [])

    const loadCompanyInfo = async () => {
        try {
            setIsLoading(true)
            const info = await companyService.getCompanyInfo()
            setCompanyInfo(info)

            // DEBUG: Log what we're about to set in formData
            console.log('🔍 DEBUG - Setting formData with address info:', {
                address: info.address,
                city: info.city,
                state: info.state,
                postalCode: info.postalCode,
                country: info.country
            })

            setFormData({
                name: info.name,
                legalName: info.legalName || '',
                taxId: info.taxId || '',
                email: info.email || '',
                phone: info.phone || '',
                website: info.website || '',
                address: info.address || '',
                city: info.city || '',
                state: info.state || '',
                postalCode: info.postalCode || '',
                country: info.country,
                timezone: info.timezone,
                currency: info.currency
            })

            if (info.branding) {
                setBranding({
                    primaryColor: info.branding.primaryColor || '#3B82F6',
                    secondaryColor: info.branding.secondaryColor || '#10B981',
                    slogan: info.branding.slogan || ''
                })
            }

            if (info.legal) {
                setLegal({
                    terms: info.legal.terms || '',
                    returnPolicy: info.legal.returnPolicy || '',
                    invoiceNotes: info.legal.invoiceNotes || ''
                })
            }

            setLogoPreview(info.logoUrl)
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const loadLocations = async () => {
        try {
            setIsLoadingLocations(true)
            const data = await locationService.getLocations()
            setLocations(data)
        } catch (error: any) {
            console.error('Error loading locations:', error)
        } finally {
            setIsLoadingLocations(false)
        }
    }

    const handleSaveBasicInfo = async () => {
        try {
            setIsSaving(true)
            await companyService.updateCompanyInfo(formData)
            toast({
                title: 'Éxito',
                description: 'Información actualizada correctamente'
            })
            await loadCompanyInfo()
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogoFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleUploadLogo = async () => {
        if (!logoFile) return
        try {
            setIsSaving(true)
            const url = await companyService.uploadLogo(logoFile)
            setLogoPreview(url)
            setLogoFile(null)
            toast({
                title: 'Éxito',
                description: 'Logo actualizado correctamente'
            })
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveBranding = async () => {
        try {
            setIsSaving(true)
            await companyService.updateBranding(branding)
            toast({
                title: 'Éxito',
                description: 'Branding actualizado correctamente'
            })
            await loadCompanyInfo()
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveLegal = async () => {
        try {
            setIsSaving(true)
            await companyService.updateLegal(legal)
            toast({
                title: 'Éxito',
                description: 'Información legal actualizada correctamente'
            })
            await loadCompanyInfo()
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const resetLocationForm = () => {
        setLocationFormData({
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

    const handleAddLocation = () => {
        resetLocationForm()
        setLocationDialogOpen(true)
    }

    const handleEditLocation = async (location: LocationListItem) => {
        try {
            const fullLocation = await locationService.getLocationById(location.id)
            setEditingLocation(fullLocation)
            setLocationFormData({
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
            setLocationDialogOpen(true)
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            })
        }
    }

    const handleDeleteLocation = (location: LocationListItem) => {
        setLocationToDelete(location)
        setDeleteLocationDialogOpen(true)
    }

    const handleLocationSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!locationFormData.name.trim()) {
            toast({
                title: 'Error',
                description: 'El nombre de la ubicación es requerido',
                variant: 'destructive'
            })
            return
        }

        setIsSaving(true)
        try {
            if (editingLocation) {
                await locationService.updateLocation(editingLocation.id, {
                    name: locationFormData.name.trim(),
                    code: locationFormData.code.trim() || undefined,
                    address: locationFormData.address.trim() || undefined,
                    city: locationFormData.city.trim() || undefined,
                    state: locationFormData.state.trim() || undefined,
                    postalCode: locationFormData.postalCode.trim() || undefined,
                    country: locationFormData.country.trim() || undefined,
                    phone: locationFormData.phone.trim() || undefined,
                    email: locationFormData.email.trim() || undefined,
                    isActive: locationFormData.isActive
                })
                toast({
                    title: 'Éxito',
                    description: 'Ubicación actualizada correctamente'
                })
            } else {
                await locationService.createLocation({
                    name: locationFormData.name.trim(),
                    code: locationFormData.code.trim() || undefined,
                    address: locationFormData.address.trim() || undefined,
                    city: locationFormData.city.trim() || undefined,
                    state: locationFormData.state.trim() || undefined,
                    postalCode: locationFormData.postalCode.trim() || undefined,
                    country: locationFormData.country.trim() || undefined,
                    phone: locationFormData.phone.trim() || undefined,
                    email: locationFormData.email.trim() || undefined,
                    isActive: locationFormData.isActive
                })
                toast({
                    title: 'Éxito',
                    description: 'Ubicación creada correctamente'
                })
            }
            setLocationDialogOpen(false)
            resetLocationForm()
            loadLocations()
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteLocationConfirm = async () => {
        if (!locationToDelete) return
        setIsDeletingLocation(true)
        try {
            await locationService.deleteLocation(locationToDelete.id)
            toast({
                title: 'Éxito',
                description: 'Ubicación eliminada correctamente'
            })
            loadLocations()
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsDeletingLocation(false)
            setDeleteLocationDialogOpen(false)
            setLocationToDelete(null)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!companyInfo) {
        return null
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/settings">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Building2 className="h-8 w-8" />
                            Configuración de Empresa
                        </h1>
                        <p className="text-muted-foreground">
                            Gestiona la información y branding de tu negocio
                        </p>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="info">Información</TabsTrigger>
                    <TabsTrigger value="locations">Ubicaciones</TabsTrigger>
                    <TabsTrigger value="branding">Branding</TabsTrigger>
                    <TabsTrigger value="legal">Legal</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información Básica</CardTitle>
                            <CardDescription>
                                Detalles generales de tu empresa y dirección principal
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre de la Empresa *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Mi Negocio"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="legalName">Razón Social</Label>
                                    <Input
                                        id="legalName"
                                        value={formData.legalName}
                                        onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                                        placeholder="Mi Negocio S.A. de C.V."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="taxId">RFC</Label>
                                    <Input
                                        id="taxId"
                                        value={formData.taxId}
                                        onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                        placeholder="XAXX010101000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="contacto@minegocio.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+52 55 1234 5678"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Sitio Web</Label>
                                    <Input
                                        id="website"
                                        type="url"
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        placeholder="https://minegocio.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Dirección Principal</Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Calle Principal #123"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">Ciudad</Label>
                                    <Input
                                        id="city"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="Ciudad de México"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="state">Estado</Label>
                                    <Input
                                        id="state"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        placeholder="CDMX"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="postalCode">Código Postal</Label>
                                    <Input
                                        id="postalCode"
                                        value={formData.postalCode}
                                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                        placeholder="01000"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSaveBasicInfo} disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Guardar Cambios
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="locations">
                    <LocationsTab
                        companyInfo={companyInfo}
                        locations={locations}
                        isLoading={isLoadingLocations}
                        onAddLocation={handleAddLocation}
                        onEditLocation={handleEditLocation}
                        onDeleteLocation={handleDeleteLocation}
                    />
                </TabsContent>

                <TabsContent value="branding" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Logo de la Empresa</CardTitle>
                            <CardDescription>
                                Sube el logo que aparecerá en facturas y documentos
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                {logoPreview && (
                                    <div className="w-32 h-32 border rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                                        <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                                    </div>
                                )}
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor="logo">Seleccionar Logo</Label>
                                    <Input
                                        id="logo"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                    />
                                    {logoFile && (
                                        <Button onClick={handleUploadLogo} disabled={isSaving} size="sm">
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Subiendo...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Subir Logo
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="h-5 w-5" />
                                Colores y Eslogan
                            </CardTitle>
                            <CardDescription>
                                Personaliza los colores de tu marca
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="primaryColor">Color Primario</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="primaryColor"
                                            type="color"
                                            value={branding.primaryColor}
                                            onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                            className="w-20 h-10"
                                        />
                                        <Input
                                            value={branding.primaryColor}
                                            onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                            placeholder="#3B82F6"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="secondaryColor">Color Secundario</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="secondaryColor"
                                            type="color"
                                            value={branding.secondaryColor}
                                            onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                                            className="w-20 h-10"
                                        />
                                        <Input
                                            value={branding.secondaryColor}
                                            onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                                            placeholder="#10B981"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slogan">Eslogan (Opcional)</Label>
                                <Input
                                    id="slogan"
                                    value={branding.slogan}
                                    onChange={(e) => setBranding({ ...branding, slogan: e.target.value })}
                                    placeholder="Tu negocio en línea"
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSaveBranding} disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Guardar Branding
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="legal">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información Legal</CardTitle>
                            <CardDescription>
                                Términos, políticas y notas legales
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="terms">Términos y Condiciones</Label>
                                <Textarea
                                    id="terms"
                                    value={legal.terms}
                                    onChange={(e) => setLegal({ ...legal, terms: e.target.value })}
                                    placeholder="Términos y condiciones de venta..."
                                    rows={5}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="returnPolicy">Política de Devoluciones</Label>
                                <Textarea
                                    id="returnPolicy"
                                    value={legal.returnPolicy}
                                    onChange={(e) => setLegal({ ...legal, returnPolicy: e.target.value })}
                                    placeholder="Política de devoluciones y garantías..."
                                    rows={5}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="invoiceNotes">Notas para Facturas</Label>
                                <Textarea
                                    id="invoiceNotes"
                                    value={legal.invoiceNotes}
                                    onChange={(e) => setLegal({ ...legal, invoiceNotes: e.target.value })}
                                    placeholder="Notas que aparecerán en facturas..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSaveLegal} disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Guardar Información Legal
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingLocation ? 'Editar Ubicación' : 'Nueva Ubicación'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingLocation
                                ? 'Actualiza los detalles de esta ubicación'
                                : 'Agrega una nueva sucursal o bodega'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleLocationSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="loc-name">Nombre *</Label>
                                <Input
                                    id="loc-name"
                                    value={locationFormData.name}
                                    onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                                    placeholder="Sucursal Centro"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="loc-code">Código</Label>
                                <Input
                                    id="loc-code"
                                    value={locationFormData.code}
                                    onChange={(e) => setLocationFormData({ ...locationFormData, code: e.target.value.toUpperCase() })}
                                    placeholder="SUC-01"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="loc-address">Dirección</Label>
                            <Input
                                id="loc-address"
                                value={locationFormData.address}
                                onChange={(e) => setLocationFormData({ ...locationFormData, address: e.target.value })}
                                placeholder="Calle y número"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="loc-city">Ciudad</Label>
                                <Input
                                    id="loc-city"
                                    value={locationFormData.city}
                                    onChange={(e) => setLocationFormData({ ...locationFormData, city: e.target.value })}
                                    placeholder="Ciudad"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="loc-state">Estado</Label>
                                <Input
                                    id="loc-state"
                                    value={locationFormData.state}
                                    onChange={(e) => setLocationFormData({ ...locationFormData, state: e.target.value })}
                                    placeholder="Estado"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="loc-postal">Código Postal</Label>
                                <Input
                                    id="loc-postal"
                                    value={locationFormData.postalCode}
                                    onChange={(e) => setLocationFormData({ ...locationFormData, postalCode: e.target.value })}
                                    placeholder="00000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="loc-phone">Teléfono</Label>
                                <Input
                                    id="loc-phone"
                                    value={locationFormData.phone}
                                    onChange={(e) => setLocationFormData({ ...locationFormData, phone: e.target.value })}
                                    placeholder="+52 55 1234 5678"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="space-y-0.5">
                                <Label>Estado</Label>
                                <p className="text-sm text-muted-foreground">
                                    Activa o desactiva esta ubicación
                                </p>
                            </div>
                            <Switch
                                checked={locationFormData.isActive}
                                onCheckedChange={(checked) => setLocationFormData({ ...locationFormData, isActive: checked })}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setLocationDialogOpen(false)}>
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
                                        {editingLocation ? 'Guardar' : 'Crear'}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteLocationDialogOpen} onOpenChange={setDeleteLocationDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar ubicación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar "{locationToDelete?.name}"? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingLocation}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteLocationConfirm}
                            disabled={isDeletingLocation}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeletingLocation ? 'Eliminando...' : 'Eliminar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
