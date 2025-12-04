'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/shared'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Check, AlertTriangle, User, Key } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface TemporaryPasswordModalProps {
    isOpen: boolean
    onClose: () => void
    username: string
    email?: string
    temporaryPassword: string
    isUsername: boolean // true if created with username, false if email
}

export function TemporaryPasswordModal({
    isOpen,
    onClose,
    username,
    email,
    temporaryPassword,
    isUsername
}: TemporaryPasswordModalProps) {
    const [copied, setCopied] = useState(false)
    const [confirmed, setConfirmed] = useState(false)

    const handleCopyPassword = () => {
        navigator.clipboard.writeText(temporaryPassword)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleCopyAll = () => {
        const credentials = `Usuario: ${isUsername ? username : email}\nContraseña: ${temporaryPassword}`
        navigator.clipboard.writeText(credentials)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleClose = () => {
        if (!confirmed) {
            alert('Por favor confirma que has entregado las credenciales al usuario')
            return
        }
        setConfirmed(false)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-yellow-100 rounded-full">
                            <AlertTriangle className="h-8 w-8 text-yellow-600" />
                        </div>
                    </div>
                    <DialogTitle className="text-center text-xl">
                        Contraseña Temporal Generada
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Usuario creado exitosamente. Entrega estas credenciales de forma segura.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Credentials Display */}
                    <div className="space-y-3">
                        {/* Username/Email */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <div>
                                    <p className="text-xs text-gray-500">
                                        {isUsername ? 'Usuario' : 'Email'}
                                    </p>
                                    <p className="font-mono font-semibold">
                                        {isUsername ? username : email}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Temporary Password */}
                        <div className="flex items-center justify-between p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Key className="h-4 w-4 text-blue-500" />
                                <div>
                                    <p className="text-xs text-blue-600 font-medium">
                                        Contraseña Temporal
                                    </p>
                                    <p className="font-mono font-bold text-lg tracking-wider">
                                        {temporaryPassword}
                                    </p>
                                </div>
                            </div>
                            <BrandButton
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyPassword}
                                className="ml-2"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </BrandButton>
                        </div>
                    </div>

                    {/* Warning Alert */}
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                            <strong>IMPORTANTE:</strong>
                            <ul className="mt-2 space-y-1 text-xs">
                                <li>• Esta contraseña solo se muestra UNA VEZ</li>
                                <li>• El usuario debe cambiarla en su primer login</li>
                                <li>• Entrega estas credenciales de forma segura</li>
                                <li>• No compartas por email o mensajes no seguros</li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    {/* Confirmation Checkbox */}
                    <div className="flex items-start space-x-2 pt-2">
                        <Checkbox
                            id="confirm"
                            checked={confirmed}
                            onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                        />
                        <Label
                            htmlFor="confirm"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Confirmo que he entregado estas credenciales al usuario de forma segura
                        </Label>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <BrandButton
                        variant="outline"
                        onClick={handleCopyAll}
                        className="w-full sm:w-auto"
                    >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Todo
                    </BrandButton>
                    <BrandButton
                        onClick={handleClose}
                        disabled={!confirmed}
                        className="w-full sm:w-auto"
                    >
                        Cerrar
                    </BrandButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
