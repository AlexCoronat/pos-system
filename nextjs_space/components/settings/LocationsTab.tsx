'use client'

import { useState } from 'react'
import { MapPin, Building2, Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import type { CompanyInfo } from '@/lib/services/company.service'
import type { LocationListItem } from '@/lib/types/settings'

interface LocationsTabProps {
    companyInfo: CompanyInfo
    locations: LocationListItem[]
    isLoading: boolean
    onAddLocation: () => void
    onEditLocation: (location: LocationListItem) => void
    onDeleteLocation: (location: LocationListItem) => void
}

export function LocationsTab({
    companyInfo,
    locations,
    isLoading,
    onAddLocation,
    onEditLocation,
    onDeleteLocation
}: LocationsTabProps) {

    // Format company address
    const formatAddress = () => {
        const parts = []
        if (companyInfo.address) parts.push(companyInfo.address)
        if (companyInfo.city || companyInfo.state) {
            const cityState = [companyInfo.city, companyInfo.state].filter(Boolean).join(', ')
            parts.push(cityState)
        }
        if (companyInfo.postalCode) parts.push(`CP ${companyInfo.postalCode}`)
        if (companyInfo.country) parts.push(companyInfo.country)

        return parts.length > 0 ? parts.join(' • ') : 'Sin dirección configurada'
    }

    return (
        <div className="space-y-6">
            {/* Main Business Address (Read-Only) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Dirección Principal
                    </CardTitle>
                    <CardDescription>
                        Esta es la dirección principal de tu empresa. Puedes editarla en la pestaña "Información"
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold mb-1">{companyInfo.name}</h3>
                            <p className="text-sm text-muted-foreground">{formatAddress()}</p>
                            {companyInfo.phone && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    📞 {companyInfo.phone}
                                </p>
                            )}
                            {companyInfo.email && (
                                <p className="text-sm text-muted-foreground">
                                    ✉️ {companyInfo.email}
                                </p>
                            )}
                            <Badge variant="outline" className="mt-2">
                                Oficina Principal
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Additional Locations (Editable) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Ubicaciones Adicionales
                        </CardTitle>
                        <CardDescription>
                            Sucursales, bodegas u otras ubicaciones de tu negocio
                        </CardDescription>
                    </div>
                    <Button onClick={onAddLocation} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Ubicación
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        </div>
                    ) : locations.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No hay ubicaciones adicionales</p>
                            <p className="text-sm mt-1">Agrega sucursales o bodegas para mejor gestión de inventario</p>
                            <Button className="mt-4" onClick={onAddLocation} variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Primera Ubicación
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead>Contacto</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {locations.map((location) => (
                                    <TableRow key={location.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                                    <MapPin className="h-5 w-5 text-green-600" />
                                                </div>
                                                <span className="font-medium">{location.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                                {location.code || '-'}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            {location.city ? (
                                                <span className="text-sm">
                                                    {location.city}
                                                    {location.state && `, ${location.state}`}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {location.phone ? (
                                                <span className="text-sm">{location.phone}</span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={location.isActive ? 'default' : 'secondary'}>
                                                {location.isActive ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onEditLocation(location)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onDeleteLocation(location)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
