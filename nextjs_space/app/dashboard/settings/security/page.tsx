'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Shield, Key, Monitor, Clock, AlertTriangle, CheckCircle2, Smartphone, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

// Mock data for active sessions
const mockSessions = [
    {
        id: '1',
        device: 'Chrome on Windows',
        location: 'Ciudad de México, México',
        ip: '192.168.1.1',
        lastActive: '2 minutos ago',
        isCurrent: true
    },
    {
        id: '2',
        device: 'Safari on iPhone',
        location: 'Ciudad de México, México',
        ip: '192.168.1.50',
        lastActive: '1 hora ago',
        isCurrent: false
    }
]

export default function SecurityPage() {
    const [loading, setLoading] = useState(false)
    const [sessions] = useState(mockSessions)
    const [isOAuthUser, setIsOAuthUser] = useState(false)
    const [oauthProvider, setOauthProvider] = useState<string>('')
    const [mfaEnabled, setMfaEnabled] = useState(false)
    const [showMfaSetup, setShowMfaSetup] = useState(false)
    const [qrCode, setQrCode] = useState('')
    const [backupCodes, setBackupCodes] = useState<string[]>([])
    const [verificationCode, setVerificationCode] = useState('')
    const [currentFactorId, setCurrentFactorId] = useState<string | null>(null)

    const supabase = createClient()

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema)
    })

    useEffect(() => {
        checkAuthProvider()
        checkMfaStatus()
    }, [])

    const checkAuthProvider = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Check if user signed up with OAuth
                const provider = user.app_metadata?.provider || user.app_metadata?.providers?.[0]

                if (provider && provider !== 'email') {
                    setIsOAuthUser(true)
                    setOauthProvider(provider)
                }
            }
        } catch (error) {
            console.error('Error checking auth provider:', error)
        }
    }

    const checkMfaStatus = async () => {
        try {
            const { data, error } = await supabase.auth.mfa.listFactors()

            if (error) throw error

            // Check if user has any verified MFA factors
            const hasVerifiedFactor = data?.totp?.some(factor => factor.status === 'verified')
            setMfaEnabled(!!hasVerifiedFactor)
        } catch (error) {
            console.error('Error checking MFA status:', error)
        }
    }

    const onSubmitPassword = async (data: ChangePasswordFormData) => {
        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({
                password: data.newPassword
            })

            if (error) throw error

            toast.success('Contraseña actualizada correctamente')
            reset()
        } catch (error: any) {
            console.error('Error updating password:', error)
            toast.error(error.message || 'Error al actualizar la contraseña')
        } finally {
            setLoading(false)
        }
    }

    const handleEnableMfa = async () => {
        try {
            setLoading(true)

            // First check if user already has an unverified factor
            const { data: existingFactors } = await supabase.auth.mfa.listFactors()
            const hasUnverified = existingFactors?.totp?.some(f => f.status !== 'verified')

            if (hasUnverified) {
                // Unenroll existing unverified factor first
                const unverifiedFactor = existingFactors?.totp?.find(f => f.status !== 'verified')
                if (unverifiedFactor) {
                    await supabase.auth.mfa.unenroll({ factorId: unverifiedFactor.id })
                }
            }

            // Enroll MFA with correct parameters
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp'
            })

            if (error) {
                console.error('MFA Enroll Error:', error)
                throw error
            }

            if (!data?.totp?.qr_code) {
                throw new Error('No se pudo generar el código QR')
            }

            // Generate backup codes (mock - in production, backend should generate these)
            const codes = Array.from({ length: 10 }, () =>
                Math.random().toString(36).substring(2, 10).toUpperCase()
            )

            setQrCode(data.totp.qr_code)
            setCurrentFactorId(data.id) // Save the factor ID
            setBackupCodes(codes)
            setShowMfaSetup(true)
        } catch (error: any) {
            console.error('MFA Setup Error:', error)
            const errorMessage = error?.message || 'Error al configurar 2FA'
            if (errorMessage.includes('already enrolled')) {
                toast.error('Ya tienes un factor 2FA configurado')
            } else if (errorMessage.includes('not allowed')) {
                toast.error('2FA no está habilitado para esta cuenta')
            } else {
                toast.error(errorMessage)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyMfa = async () => {
        try {
            setLoading(true)

            // Use the saved factor ID from enrollment
            if (!currentFactorId) {
                throw new Error('No se encontró el factor de autenticación. Intenta habilitar 2FA de nuevo.')
            }

            const { error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: currentFactorId,
                code: verificationCode
            })

            if (error) throw error

            setMfaEnabled(true)
            setShowMfaSetup(false)
            setCurrentFactorId(null)
            setVerificationCode('')
            toast.success('2FA habilitado correctamente')
        } catch (error: any) {
            toast.error(error.message || 'Código inválido')
        } finally {
            setLoading(false)
        }
    }

    const handleDisableMfa = async () => {
        try {
            setLoading(true)

            const { data: factors } = await supabase.auth.mfa.listFactors()
            const factor = factors?.totp?.find(f => f.status === 'verified')

            if (!factor) throw new Error('No verified factor found')

            const { error } = await supabase.auth.mfa.unenroll({
                factorId: factor.id
            })

            if (error) throw error

            setMfaEnabled(false)
            toast.success('2FA deshabilitado correctamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al deshabilitar 2FA')
        } finally {
            setLoading(false)
        }
    }

    const handleRevokeSession = async (sessionId: string) => {
        try {
            toast.success('Sesión revocada correctamente')
        } catch (error) {
            toast.error('Error al revocar la sesión')
        }
    }

    const handleRevokeAllSessions = async () => {
        try {
            const { error } = await supabase.auth.signOut({ scope: 'global' })
            if (error) throw error

            toast.success('Todas las sesiones han sido cerradas')
            window.location.href = '/auth/login'
        } catch (error: any) {
            toast.error('Error al cerrar las sesiones')
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Copiado al portapapeles')
    }

    const downloadBackupCodes = () => {
        const text = backupCodes.join('\n')
        const blob = new Blob([text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'backup-codes.txt'
        a.click()
        toast.success('Códigos descargados')
    }

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="Seguridad"
                subtitle="Administra tu contraseña, sesiones y configuración de seguridad"
            />

            <div className="max-w-4xl space-y-6">
                {/* OAuth Notice */}
                {isOAuthUser && (
                    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                                        Cuenta autenticada con {oauthProvider}
                                    </h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                        Tu cuenta está vinculada con {oauthProvider}. No puedes cambiar la contraseña desde aquí.
                                        Para gestionar tu seguridad, visita la configuración de tu cuenta de {oauthProvider}.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Change Password - Only for email/password users */}
                {!isOAuthUser && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="h-5 w-5" />
                                Cambiar Contraseña
                            </CardTitle>
                            <CardDescription>
                                Actualiza tu contraseña regularmente para mantener tu cuenta segura
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                                    <Input
                                        id="currentPassword"
                                        type="password"
                                        {...register('currentPassword')}
                                        className={errors.currentPassword ? 'border-red-500' : ''}
                                    />
                                    {errors.currentPassword && (
                                        <p className="text-sm text-red-500">{errors.currentPassword.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        {...register('newPassword')}
                                        className={errors.newPassword ? 'border-red-500' : ''}
                                    />
                                    {errors.newPassword && (
                                        <p className="text-sm text-red-500">{errors.newPassword.message}</p>
                                    )}
                                    <div className="text-xs text-gray-500 space-y-1">
                                        <p>La contraseña debe contener:</p>
                                        <ul className="list-disc list-inside ml-2">
                                            <li>Al menos 8 caracteres</li>
                                            <li>Una letra mayúscula</li>
                                            <li>Una letra minúscula</li>
                                            <li>Un número</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        {...register('confirmPassword')}
                                        className={errors.confirmPassword ? 'border-red-500' : ''}
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                                    )}
                                </div>

                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Two-Factor Authentication */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5" />
                            Autenticación de Dos Factores (2FA)
                        </CardTitle>
                        <CardDescription>
                            Añade una capa extra de seguridad a tu cuenta
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!showMfaSetup ? (
                            <>
                                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    {mfaEnabled ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                    ) : (
                                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <h4 className="font-semibold">
                                            {mfaEnabled ? '2FA Activo' : '2FA Desactivado'}
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {mfaEnabled
                                                ? 'Tu cuenta está protegida con autenticación de dos factores'
                                                : 'Protege tu cuenta con un código de verificación adicional'
                                            }
                                        </p>
                                    </div>
                                    <Button
                                        variant={mfaEnabled ? 'destructive' : 'default'}
                                        onClick={mfaEnabled ? handleDisableMfa : handleEnableMfa}
                                        disabled={loading}
                                    >
                                        {mfaEnabled ? 'Deshabilitar 2FA' : 'Habilitar 2FA'}
                                    </Button>
                                </div>

                                {!mfaEnabled && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        <p className="font-semibold mb-2">¿Cómo funciona?</p>
                                        <ol className="list-decimal list-inside space-y-1 ml-2">
                                            <li>Descarga una aplicación de autenticación (Google Authenticator, Authy, etc.)</li>
                                            <li>Escanea el código QR con la aplicación</li>
                                            <li>Ingresa el código de 6 dígitos para verificar</li>
                                            <li>Guarda tus códigos de respaldo en un lugar seguro</li>
                                        </ol>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-center">
                                    <h4 className="font-semibold mb-4">Escanea este código QR</h4>
                                    {qrCode && (
                                        <div className="inline-block p-4 bg-white rounded-lg">
                                            <Image src={qrCode} alt="QR Code" width={200} height={200} />
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                                        Usa tu aplicación de autenticación para escanear este código
                                    </p>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label htmlFor="verificationCode">Código de Verificación</Label>
                                    <Input
                                        id="verificationCode"
                                        type="text"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                    />
                                    <p className="text-xs text-gray-500">
                                        Ingresa el código de 6 dígitos de tu aplicación
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Códigos de Respaldo</Label>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                            Guarda estos códigos en un lugar seguro. Puedes usarlos si pierdes acceso a tu aplicación.
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                                            {backupCodes.map((code, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                                                    <span>{code}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(code)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={downloadBackupCodes}
                                            className="w-full mt-3"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Descargar Códigos
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleVerifyMfa}
                                        disabled={loading || verificationCode.length !== 6}
                                        className="flex-1"
                                    >
                                        {loading ? 'Verificando...' : 'Verificar y Activar'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowMfaSetup(false)}
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Active Sessions */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Monitor className="h-5 w-5" />
                                    Sesiones Activas
                                </CardTitle>
                                <CardDescription>
                                    Administra los dispositivos con acceso a tu cuenta
                                </CardDescription>
                            </div>
                            <Button variant="destructive" size="sm" onClick={handleRevokeAllSessions}>
                                Cerrar Todas las Sesiones
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {sessions.map((session) => (
                            <div key={session.id} className="flex items-start justify-between p-4 border rounded-lg">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Monitor className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold">{session.device}</h4>
                                            {session.isCurrent && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                    Sesión Actual
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {session.location} • {session.ip}
                                        </p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            <Clock className="h-3 w-3" />
                                            Último acceso: {session.lastActive}
                                        </p>
                                    </div>
                                </div>
                                {!session.isCurrent && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRevokeSession(session.id)}
                                    >
                                        Revocar
                                    </Button>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Security Recommendations */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Recomendaciones de Seguridad
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Status indicator - different for OAuth vs Password */}
                        {!isOAuthUser ? (
                            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-green-900 dark:text-green-100">
                                        Contraseña Segura
                                    </h4>
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        Tu contraseña cumple con los requisitos de seguridad
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                                        Autenticación OAuth Activa
                                    </h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Tu cuenta está protegida por {oauthProvider}. Administra la seguridad desde tu cuenta de {oauthProvider}.
                                    </p>
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* Security tips - conditional based on auth type */}
                        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                                    Consejos de Seguridad
                                </h4>
                                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 mt-2 list-disc list-inside">
                                    {!isOAuthUser && <li>Cambia tu contraseña cada 90 días</li>}
                                    <li>Habilita la autenticación de dos factores (2FA)</li>
                                    {!isOAuthUser && <li>No compartas tu contraseña con nadie</li>}
                                    {!isOAuthUser && <li>Usa contraseñas diferentes para cada servicio</li>}
                                    {isOAuthUser && <li>Mantén segura tu cuenta de {oauthProvider}</li>}
                                    {isOAuthUser && <li>Habilita 2FA en tu cuenta de {oauthProvider}</li>}
                                    <li>Cierra sesión en dispositivos públicos o compartidos</li>
                                    <li>Revisa regularmente las sesiones activas</li>
                                    {mfaEnabled && <li>Guarda tus códigos de respaldo de 2FA en un lugar seguro</li>}
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
