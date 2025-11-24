'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    ArrowLeft,
    Archive,
    Users,
    Loader2,
    Shield,
    MapPin,
    Calendar,
    User,
    FileText
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
import { Badge } from '@/components/ui/badge'
import { teamService } from '@/lib/services/team.service'
import { toast } from 'sonner'

interface ArchivedUser {
    id: string
    email: string
    first_name: string
    last_name: string
    phone: string | null
    role_name: string
    archived_at: string
    archived_by_email: string | null
    removal_reason: string | null
    assigned_locations: any
    original_created_at: string
}

export default function ArchivedUsersPage() {
    const [archivedUsers, setArchivedUsers] = useState<ArchivedUser[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const loadArchivedUsers = async () => {
        setIsLoading(true)
        try {
            const data = await teamService.getArchivedUsers()
            setArchivedUsers(data)
        } catch (error: any) {
            toast.error(error.message || 'Error al cargar usuarios archivados')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadArchivedUsers()
    }, [])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/settings/team">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Archive className="h-8 w-8" />
                            Usuarios Archivados
                        </h1>
                        <p className="text-muted-foreground">
                            Historial de miembros dados de baja del equipo
                        </p>
                    </div>
                </div>
            </div>

            {/* Archived Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Historial de Usuarios
                    </CardTitle>
                    <CardDescription>
                        {archivedUsers.length} usuario{archivedUsers.length !== 1 ? 's' : ''} archivado{archivedUsers.length !== 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        </div>
                    ) : archivedUsers.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No hay usuarios archivados</p>
                            <p className="text-sm mt-2">
                                Los usuarios que sean eliminados del equipo aparecerán aquí
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Usuario</TableHead>
                                        <TableHead>Rol</TableHead>
                                        <TableHead>Ubicaciones Asignadas</TableHead>
                                        <TableHead>Fecha de Archivo</TableHead>
                                        <TableHead>Archivado Por</TableHead>
                                        <TableHead>Razón</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {archivedUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                        <span className="text-gray-600 font-medium">
                                                            {user.first_name?.[0]}{user.last_name?.[0]}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">
                                                            {user.first_name} {user.last_name}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {user.email}
                                                        </div>
                                                        {user.phone && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {user.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                    <Shield className="h-3 w-3" />
                                                    {user.role_name || 'Sin rol'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.assigned_locations && Array.isArray(user.assigned_locations) ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.assigned_locations.map((loc: any, idx: number) => (
                                                            <Badge
                                                                key={idx}
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                <MapPin className="h-3 w-3 mr-1" />
                                                                {loc.location_name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">
                                                        Sin ubicaciones
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    <span>{formatDate(user.archived_at)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span>{user.archived_by_email || 'Sistema'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {user.removal_reason ? (
                                                    <div className="flex items-start gap-2 max-w-xs">
                                                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                        <span className="text-sm">{user.removal_reason}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground italic">
                                                        Sin razón especificada
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Archive className="h-4 w-4 text-blue-600" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-medium text-blue-900 mb-1">
                                Acerca de los Usuarios Archivados
                            </h3>
                            <p className="text-sm text-blue-800">
                                Los usuarios archivados han sido eliminados del equipo activo. Esta tabla mantiene
                                un historial completo para fines de auditoría y referencia. Los usuarios archivados
                                no pueden iniciar sesión y no aparecen en las listas de miembros activos del equipo.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
