'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Phone,
    Plus,
    Building2,
    RefreshCw,
    Trash2,
    Link,
    Unlink,
    MessageSquare,
    AlertCircle,
    CheckCircle,
    ArrowLeft
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/shared'
import {
    whatsappAdminService,
    WhatsAppNumber,
    QuoteUsageMonthly
} from '@/lib/services/whatsapp-admin.service'

export default function WhatsAppAdminPage() {
    const { toast } = useToast()
    const router = useRouter()

    const [numbers, setNumbers] = useState<WhatsAppNumber[]>([])
    const [businesses, setBusinesses] = useState<{ id: number; name: string }[]>([])
    const [usage, setUsage] = useState<QuoteUsageMonthly[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Modal states
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [assignModalOpen, setAssignModalOpen] = useState(false)
    const [selectedNumber, setSelectedNumber] = useState<WhatsAppNumber | null>(null)

    // Form states
    const [newNumber, setNewNumber] = useState({ phone: '', name: '', notes: '' })
    const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setIsLoading(true)
            const [numbersData, businessesData, usageData] = await Promise.all([
                whatsappAdminService.getNumbers(),
                whatsappAdminService.getBusinesses(),
                whatsappAdminService.getMonthlyUsage()
            ])
            setNumbers(numbersData)
            setBusinesses(businessesData)
            setUsage(usageData)
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

    const handleAddNumber = async () => {
        if (!newNumber.phone) return

        try {
            setIsSubmitting(true)
            await whatsappAdminService.addNumber({
                phoneNumber: newNumber.phone,
                friendlyName: newNumber.name,
                notes: newNumber.notes
            })
            toast({ title: 'Número agregado', description: newNumber.phone })
            setAddModalOpen(false)
            setNewNumber({ phone: '', name: '', notes: '' })
            loadData()
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleAssignNumber = async () => {
        if (!selectedNumber || !selectedBusinessId) return

        try {
            setIsSubmitting(true)
            await whatsappAdminService.assignNumber(selectedNumber.id, parseInt(selectedBusinessId))
            toast({ title: 'Número asignado', description: `${selectedNumber.phoneNumber} asignado correctamente` })
            setAssignModalOpen(false)
            setSelectedNumber(null)
            setSelectedBusinessId('')
            loadData()
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUnassignNumber = async (number: WhatsAppNumber) => {
        try {
            await whatsappAdminService.unassignNumber(number.id)
            toast({ title: 'Número liberado', description: number.phoneNumber })
            loadData()
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    }

    const handleDeleteNumber = async (number: WhatsAppNumber) => {
        if (!confirm(`¿Eliminar ${number.phoneNumber}?`)) return

        try {
            await whatsappAdminService.deleteNumber(number.id)
            toast({ title: 'Número eliminado' })
            loadData()
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    }

    const openAssignModal = (number: WhatsAppNumber) => {
        setSelectedNumber(number)
        setAssignModalOpen(true)
    }

    if (isLoading) {
        return (
            <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/dashboard/settings')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                    </Button>
                    <PageHeader
                        title="Administración WhatsApp"
                        subtitle="Gestiona el pool de números y asignaciones"
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualizar
                    </Button>
                    <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Número
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Agregar Número al Pool</DialogTitle>
                                <DialogDescription>
                                    Agrega un nuevo número de WhatsApp que hayas comprado en Twilio
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Número de teléfono</Label>
                                    <Input
                                        placeholder="+521234567890"
                                        value={newNumber.phone}
                                        onChange={(e) => setNewNumber({ ...newNumber, phone: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Nombre amigable (opcional)</Label>
                                    <Input
                                        placeholder="Ej: CDMX Principal"
                                        value={newNumber.name}
                                        onChange={(e) => setNewNumber({ ...newNumber, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Notas (opcional)</Label>
                                    <Input
                                        placeholder="Notas internas"
                                        value={newNumber.notes}
                                        onChange={(e) => setNewNumber({ ...newNumber, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleAddNumber} disabled={isSubmitting || !newNumber.phone}>
                                    {isSubmitting ? 'Agregando...' : 'Agregar'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                                <Phone className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{numbers.length}</p>
                                <p className="text-sm text-muted-foreground">Números totales</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Building2 className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {numbers.filter(n => n.businessId).length}
                                </p>
                                <p className="text-sm text-muted-foreground">Asignados</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                                <MessageSquare className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {usage.reduce((sum, u) => sum + u.quotesUsed, 0)}
                                </p>
                                <p className="text-sm text-muted-foreground">Cotizaciones este mes</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Numbers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Pool de Números</CardTitle>
                    <CardDescription>
                        Números de WhatsApp disponibles para asignar a negocios
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Número</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Negocio Asignado</TableHead>
                                <TableHead>Asignado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {numbers.map((number) => (
                                <TableRow key={number.id}>
                                    <TableCell className="font-mono">{number.phoneNumber}</TableCell>
                                    <TableCell>{number.friendlyName || '-'}</TableCell>
                                    <TableCell>
                                        {number.isVerified ? (
                                            <Badge className="bg-green-100 text-green-800">
                                                <CheckCircle className="h-3 w-3 mr-1" /> Verificado
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">Pendiente</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {number.businessName || (
                                            <span className="text-muted-foreground">Sin asignar</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {number.assignedAt
                                            ? new Date(number.assignedAt).toLocaleDateString()
                                            : '-'
                                        }
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {number.businessId ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUnassignNumber(number)}
                                                >
                                                    <Unlink className="h-4 w-4 mr-1" />
                                                    Liberar
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openAssignModal(number)}
                                                >
                                                    <Link className="h-4 w-4 mr-1" />
                                                    Asignar
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteNumber(number)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {numbers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No hay números en el pool. Agrega uno para comenzar.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Usage Table */}
            {usage.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Uso Mensual por Negocio</CardTitle>
                        <CardDescription>
                            Cotizaciones generadas este mes ({new Date().toISOString().slice(0, 7)})
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Negocio</TableHead>
                                    <TableHead>Usadas</TableHead>
                                    <TableHead>Límite</TableHead>
                                    <TableHead>Excedentes</TableHead>
                                    <TableHead>Monto Extra</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {usage.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell>{u.businessName}</TableCell>
                                        <TableCell>{u.quotesUsed}</TableCell>
                                        <TableCell>
                                            {u.quotesLimit === -1 ? '∞' : u.quotesLimit}
                                        </TableCell>
                                        <TableCell>
                                            {u.overageQuotes > 0 ? (
                                                <Badge variant="destructive">{u.overageQuotes}</Badge>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {u.overageAmount > 0
                                                ? `$${u.overageAmount.toFixed(2)}`
                                                : '-'
                                            }
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Assign Modal */}
            <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Asignar Número a Negocio</DialogTitle>
                        <DialogDescription>
                            Asignar {selectedNumber?.phoneNumber} a un negocio
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Selecciona un negocio</Label>
                            <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un negocio" />
                                </SelectTrigger>
                                <SelectContent>
                                    {businesses.map((b) => (
                                        <SelectItem key={b.id} value={b.id.toString()}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAssignNumber} disabled={isSubmitting || !selectedBusinessId}>
                            {isSubmitting ? 'Asignando...' : 'Asignar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
