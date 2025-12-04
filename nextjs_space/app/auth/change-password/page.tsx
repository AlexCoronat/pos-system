'use client'

import { useState } from 'react'
import { authService } from '@/lib/services/auth.service'
import { useRouter } from 'next/navigation'
import { BrandButton } from '@/components/shared'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Lock, Shield } from 'lucide-react'

export default function ChangePasswordPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [data, setData] = useState({
        current: '',
        new: '',
        confirm: ''
    })

    // Simple password strength indicator
    const getPasswordStrength = (password: string) => {
        if (password.length === 0) return { strength: 0, label: '', color: '' }
        if (password.length < 8) return { strength: 25, label: 'Débil', color: 'bg-red-500' }

        let strength = 25
        if (/[A-Z]/.test(password)) strength += 25
        if (/[0-9]/.test(password)) strength += 25
        if (/[^A-Za-z0-9]/.test(password)) strength += 25

        if (strength <= 25) return { strength, label: 'Débil', color: 'bg-red-500' }
        if (strength <= 50) return { strength, label: 'Regular', color: 'bg-orange-500' }
        if (strength <= 75) return { strength, label: 'Buena', color: 'bg-yellow-500' }
        return { strength, label: 'Fuerte', color: 'bg-green-500' }
    }

    const passwordStrength = getPasswordStrength(data.new)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            await authService.changePasswordFirstLogin(
                data.current,
                data.new,
                data.confirm
            )
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Error al cambiar contraseña')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                            <Shield className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">
                        Cambiar Contraseña
                    </CardTitle>
                    <CardDescription className="text-center">
                        Por seguridad, debes cambiar tu contraseña temporal
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Alert className="mb-6 border-blue-200 bg-blue-50">
                        <Lock className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                            Tu nueva contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos.
                        </AlertDescription>
                    </Alert>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Current Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Contraseña Temporal
                            </label>
                            <div className="relative">
                                <Input
                                    type={showCurrent ? 'text' : 'password'}
                                    value={data.current}
                                    onChange={(e) => setData({ ...data, current: e.target.value })}
                                    placeholder="Ingresa tu contraseña temporal"
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Nueva Contraseña
                            </label>
                            <div className="relative">
                                <Input
                                    type={showNew ? 'text' : 'password'}
                                    value={data.new}
                                    onChange={(e) => setData({ ...data, new: e.target.value })}
                                    placeholder="Crea una contraseña segura"
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            {/* Password Strength Indicator */}
                            {data.new && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-600">Fortaleza:</span>
                                        <span className={`font-medium ${passwordStrength.strength <= 25 ? 'text-red-600' :
                                                passwordStrength.strength <= 50 ? 'text-orange-600' :
                                                    passwordStrength.strength <= 75 ? 'text-yellow-600' :
                                                        'text-green-600'
                                            }`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${passwordStrength.color} transition-all duration-300`}
                                            style={{ width: `${passwordStrength.strength}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Confirmar Contraseña
                            </label>
                            <div className="relative">
                                <Input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={data.confirm}
                                    onChange={(e) => setData({ ...data, confirm: e.target.value })}
                                    placeholder="Repite tu nueva contraseña"
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {data.confirm && data.new !== data.confirm && (
                                <p className="text-xs text-red-600">Las contraseñas no coinciden</p>
                            )}
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <BrandButton
                            type="submit"
                            disabled={!data.current || !data.new || !data.confirm || data.new !== data.confirm}
                            className="w-full"
                            isLoading={loading}
                            loadingText="Cambiando contraseña..."
                        >
                            Cambiar Contraseña
                        </BrandButton>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
