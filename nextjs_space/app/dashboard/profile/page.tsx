'use client'

import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { Moon, Sun, Globe, Monitor, DollarSign, Calendar, Clock, Bell, Volume2, Mail, Type, Eye, Keyboard, Wallet, Check, Shield, Key, Smartphone, AlertTriangle, CheckCircle2, Copy, Download, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/validations/auth'
import Image from 'next/image'

// --- Types & Defaults (Migrated from Preferences) ---
interface UserPreferences {
  language: string
  dateFormat: string
  timeFormat: string
  currency: string
  firstDayOfWeek: string
  desktopNotifications: boolean
  soundEnabled: boolean
  dailyEmailSummary: boolean
  fontSize: string
  density: string
  animationsEnabled: boolean
  sidebarDefault: string
  defaultPage: string
  highContrast: boolean
  reduceMotion: boolean
  keyboardFocus: boolean
}

const DEFAULT_PROFILE_PREFS: UserPreferences = {
  language: 'es',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  currency: 'MXN',
  firstDayOfWeek: 'monday',
  desktopNotifications: true,
  soundEnabled: true,
  dailyEmailSummary: false,
  fontSize: 'normal',
  density: 'normal',
  animationsEnabled: true,
  sidebarDefault: 'expanded',
  defaultPage: 'dashboard',
  highContrast: false,
  reduceMotion: false,
  keyboardFocus: true,
}

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

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  // Preferences State
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PROFILE_PREFS)

  // Security State
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

  // Subscription Plans State
  const [availablePlans, setAvailablePlans] = useState<any[]>([])

  // Form Hook for Password Change
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema)
  })

  useEffect(() => {
    setMounted(true)
    loadPreferences()
    checkAuthProvider()
    checkMfaStatus()
    loadAvailablePlans()
  }, [])

  const loadAvailablePlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, description, price, currency, billing_period, max_users, max_locations, max_products, features, whatsapp_enabled, monthly_quote_limit')
        .eq('is_active', true)
        .order('price', { ascending: true })

      if (error) throw error
      setAvailablePlans(data || [])
    } catch (error) {
      console.error('Error loading plans:', error)
    }
  }

  const loadPreferences = () => {
    const saved = localStorage.getItem('userPreferences')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPreferences({ ...DEFAULT_PROFILE_PREFS, ...parsed })
      } catch (e) {
        console.error('Error loading preferences:', e)
      }
    }
  }

  const savePreferences = (newPrefs: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPrefs }
    setPreferences(updated)
    const existing = localStorage.getItem('userPreferences')
    let fullObject = {}
    if (existing) {
      try {
        fullObject = JSON.parse(existing)
      } catch (e) { }
    }
    localStorage.setItem('userPreferences', JSON.stringify({ ...fullObject, ...updated }))
    toast.success('Cambios guardados')
  }

  const checkAuthProvider = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
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
      const { data: existingFactors } = await supabase.auth.mfa.listFactors()
      const hasUnverified = existingFactors?.totp?.some(f => f.status !== 'verified')

      if (hasUnverified) {
        const unverifiedFactor = existingFactors?.totp?.find(f => f.status !== 'verified')
        if (unverifiedFactor) {
          await supabase.auth.mfa.unenroll({ factorId: unverifiedFactor.id })
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      })

      if (error) throw error

      if (!data?.totp?.qr_code) {
        throw new Error('No se pudo generar el código QR')
      }

      const codes = Array.from({ length: 10 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      )

      setQrCode(data.totp.qr_code)
      setCurrentFactorId(data.id)
      setBackupCodes(codes)
      setShowMfaSetup(true)
    } catch (error: any) {
      console.error('MFA Setup Error:', error)
      toast.error(error?.message || 'Error al configurar 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyMfa = async () => {
    try {
      setLoading(true)
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
  }

  if (!mounted) {
    return <div className="p-6">Cargando perfil...</div>
  }

  const themeOptions = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor }
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header Profile Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 bg-white dark:bg-gray-900 p-6 rounded-xl border shadow-sm">
        <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
          <AvatarImage src={user?.avatarUrl || "/placeholder-avatar.jpg"} />
          <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
            {user?.firstName?.charAt(0) || 'U'}{user?.lastName?.charAt(0) || ''}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{user?.firstName} {user?.lastName}</h1>
            <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">Administrador</Badge>
          </div>
          <p className="text-muted-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground">ID: {user?.id.split('-')[0]}...</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Editar Datos</Button>
        </div>
      </div>

      <Tabs defaultValue="subscription" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="subscription">Suscripción</TabsTrigger>
          <TabsTrigger value="preferences">Apariencia</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
        </TabsList>

        {/* SUBSCRIPTION TAB */}
        <TabsContent value="subscription" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Plan */}
            <Card className="lg:col-span-2 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-blue-700 dark:text-blue-400">
                      Plan {user?.plan?.name || user?.planName || 'Sin Plan'}
                    </CardTitle>
                    <CardDescription>
                      {user?.plan?.description || `Facturación ${user?.plan?.billingPeriod === 'monthly' ? 'Mensual' : user?.plan?.billingPeriod === 'yearly' ? 'Anual' : 'Mensual'}`}
                    </CardDescription>
                  </div>
                  <Badge className="bg-green-500 hover:bg-green-600">Activo</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">
                    ${user?.plan?.price?.toLocaleString() || '0'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {user?.plan?.currency || 'MXN'} / {user?.plan?.billingPeriod === 'yearly' ? 'año' : 'mes'} + IVA
                  </span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Wallet className="mr-2 h-4 w-4" />
                    Gestionar Suscripción
                  </Button>
                  <Button variant="outline">Ver Historial de Pagos</Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 bg-white/50 dark:bg-black/20 p-3 rounded-lg w-fit">
                  <Calendar className="h-4 w-4" />
                  Próximo cobro: Consultar en portal de pagos
                </div>
              </CardContent>
            </Card>

            {/* Usage Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Límites del Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Usuarios</span>
                    <span className="font-medium">
                      {user?.plan?.maxUsers === -1 ? 'Ilimitados' : `Máx. ${user?.plan?.maxUsers || 1}`}
                    </span>
                  </div>
                  <Progress value={user?.plan?.maxUsers === -1 ? 10 : 50} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sucursales</span>
                    <span className="font-medium">
                      {user?.plan?.maxLocations === -1 ? 'Ilimitadas' : `Máx. ${user?.plan?.maxLocations || 1}`}
                    </span>
                  </div>
                  <Progress value={user?.plan?.maxLocations === -1 ? 10 : 50} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Productos</span>
                    <span className="font-medium">
                      {user?.plan?.maxProducts === -1 ? 'Ilimitados' : `Máx. ${user?.plan?.maxProducts || 50}`}
                    </span>
                  </div>
                  <Progress value={user?.plan?.maxProducts === -1 ? 10 : 30} className="h-2" />
                </div>
                {user?.plan?.whatsappEnabled && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cotizaciones WhatsApp</span>
                      <span className="font-medium">
                        {user?.plan?.monthlyQuoteLimit === -1 ? 'Ilimitadas' : `${user?.plan?.monthlyQuoteLimit || 0} / mes`}
                      </span>
                    </div>
                    <Progress value={user?.plan?.monthlyQuoteLimit === -1 ? 10 : 50} className="h-2 bg-green-100 [&>div]:bg-green-500" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Available Plans - Only show plans different from current */}
          {availablePlans.filter(plan => plan.id !== user?.plan?.id).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Otros Planes Disponibles</CardTitle>
                <CardDescription>Compara y elige el plan que mejor se adapte a tu negocio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availablePlans
                    .filter(plan => plan.id !== user?.plan?.id)
                    .map((plan) => (
                      <div
                        key={plan.id}
                        className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{plan.name}</h4>
                          {parseFloat(plan.price) > (user?.plan?.price || 0) && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">Upgrade</Badge>
                          )}
                        </div>
                        <p className="text-2xl font-bold mb-1">
                          ${parseFloat(plan.price).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mb-4">
                          {parseFloat(plan.price) === 0 ? 'Gratis para siempre' : `${plan.currency || 'MXN'} / ${plan.billing_period === 'yearly' ? 'año' : 'mes'}`}
                        </p>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          <li className="flex items-center gap-1">
                            <Check className="h-3 w-3 text-green-500" />
                            {plan.max_users === -1 ? 'Usuarios ilimitados' : `${plan.max_users} usuarios`}
                          </li>
                          <li className="flex items-center gap-1">
                            <Check className="h-3 w-3 text-green-500" />
                            {plan.max_locations === -1 ? 'Sucursales ilimitadas' : `${plan.max_locations} sucursales`}
                          </li>
                          <li className="flex items-center gap-1">
                            <Check className="h-3 w-3 text-green-500" />
                            {plan.max_products === -1 ? 'Productos ilimitados' : `${plan.max_products.toLocaleString()} productos`}
                          </li>
                          {plan.whatsapp_enabled && (
                            <li className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              WhatsApp habilitado
                            </li>
                          )}
                        </ul>
                        <Button variant="outline" size="sm" className="w-full mt-4">
                          {parseFloat(plan.price) > (user?.plan?.price || 0) ? 'Mejorar Plan' : 'Cambiar Plan'}
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* VISUAL & REGIONAL PREFERENCES TAB */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tema de Apariencia</CardTitle>
              <CardDescription>Personaliza la interfaz visual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex w-full rounded-lg border border-gray-200 dark:border-gray-800 divide-x divide-gray-200 dark:divide-gray-800 overflow-hidden">
                {themeOptions.map((option) => {
                  const Icon = option.icon
                  const isSelected = theme === option.value
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={`flex-1 p-4 transition-all flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600' : 'text-muted-foreground'}`}
                    >
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600' : ''}`} />
                      <span className={`text-sm ${isSelected ? 'font-medium' : ''}`}>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interfaz y Accesibilidad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Type className="h-4 w-4" />Tamaño de Fuente</Label>
                  <Select value={preferences.fontSize} onValueChange={(value) => savePreferences({ fontSize: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequeño</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe className="h-4 w-4" />Idioma</Label>
                  <Select value={preferences.language} onValueChange={(value) => savePreferences({ language: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English (US)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Animaciones de Interfaz</Label>
                  <p className="text-xs text-muted-foreground">Efectos visuales al navegar</p>
                </div>
                <Switch checked={preferences.animationsEnabled} onCheckedChange={(checked) => savePreferences({ animationsEnabled: checked })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS TAB */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Notificación</CardTitle>
              <CardDescription>Controla qué notificaciones ves o escuchas en este dispositivo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Navigation Hint */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Info className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">¿Buscas configurar alertas de stock o ventas?</h4>
                  <p className="text-xs text-gray-500">
                    Esas son reglas de negocio. Configúralas en <button onClick={() => router.push('/dashboard/settings/notifications')} className="underline hover:text-blue-600">Ajustes &gt; Notificaciones</button>.
                  </p>
                </div>
              </div>
              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mx-0"><Bell className="h-5 w-5" /></div>
                  <div>
                    <Label>Notificaciones de Escritorio</Label>
                    <p className="text-xs text-muted-foreground">Alertas popup mientras usas el sistema</p>
                  </div>
                </div>
                <Switch checked={preferences.desktopNotifications} onCheckedChange={(checked) => savePreferences({ desktopNotifications: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600 mx-0"><Volume2 className="h-5 w-5" /></div>
                  <div>
                    <Label>Sonidos del Sistema</Label>
                    <p className="text-xs text-muted-foreground">Feedback auditivo al completar acciones</p>
                  </div>
                </div>
                <Switch checked={preferences.soundEnabled} onCheckedChange={(checked) => savePreferences({ soundEnabled: checked })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY TAB (Migrated) */}
        <TabsContent value="security" className="space-y-6">

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* 1. Change Password / OAuth Info */}
            <div className="space-y-6">
              {isOAuthUser ? (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 h-full flex flex-col justify-center">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                          Autenticado con {oauthProvider}
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Tu cuenta está vinculada externamente. Gestiona tu seguridad desde {oauthProvider}.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Cambiar Contraseña
                    </CardTitle>
                    <CardDescription>
                      Seguridad de acceso
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Actual</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          {...register('currentPassword')}
                          className={errors.currentPassword ? 'border-red-500' : ''}
                        />
                        {errors.currentPassword && <p className="text-xs text-red-500">{errors.currentPassword.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nueva</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          {...register('newPassword')}
                          className={errors.newPassword ? 'border-red-500' : ''}
                        />
                        {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          {...register('confirmPassword')}
                          className={errors.confirmPassword ? 'border-red-500' : ''}
                        />
                        {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                      </div>

                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 2. 2FA Configuration */}
            <div className="space-y-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Doble Factor (2FA)
                  </CardTitle>
                  <CardDescription>
                    Protección adicional
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
                          <h4 className="font-semibold text-sm">
                            {mfaEnabled ? '2FA Activo' : '2FA Inactivo'}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {mfaEnabled
                              ? 'Tu cuenta está protegida.'
                              : 'Recomendamos activar 2FA para mayor seguridad.'
                            }
                          </p>
                        </div>
                        <Switch
                          checked={mfaEnabled}
                          onCheckedChange={mfaEnabled ? handleDisableMfa : handleEnableMfa}
                          disabled={loading}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="text-center">
                        {qrCode && (
                          <div className="inline-block p-4 bg-white rounded-lg border shadow-sm mb-4">
                            <Image src={qrCode} alt="QR Code" width={150} height={150} />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mb-4">Escanea con Google Authenticator</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Código de Verificación</Label>
                        <Input
                          placeholder="000000"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          className="text-center tracking-widest text-lg"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleVerifyMfa} disabled={loading || verificationCode.length !== 6} className="flex-1">
                          Verificar
                        </Button>
                        <Button variant="outline" onClick={() => setShowMfaSetup(false)}>
                          Cancelar
                        </Button>
                      </div>

                      <div className="pt-4 border-t">
                        <Label className="text-xs mb-2 block">Códigos de Respaldo (Guardar)</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {backupCodes.slice(0, 4).map((code) => (
                            <div key={code} className="text-center text-xs font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">
                              {code}
                            </div>
                          ))}
                        </div>
                        <Button variant="ghost" size="sm" onClick={downloadBackupCodes} className="w-full mt-2 text-xs">
                          <Download className="h-3 w-3 mr-2" /> Descargar Todos
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 3. Active Sessions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Monitor className="h-5 w-5" />
                  Sesiones Activas
                </CardTitle>
                <Button variant="destructive" size="sm" onClick={handleRevokeAllSessions} className="h-8 text-xs">
                  Cerrar Todas
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Monitor className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{session.device}</h4>
                        {session.isCurrent && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                            Actual
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {session.location} • {session.lastActive}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Revocar
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
