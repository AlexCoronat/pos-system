'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
    Bot,
    Settings,
    MessageSquare,
    Mail,
    Smartphone,
    Save,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Info,
    Zap,
    Shield,
    ExternalLink,
    Copy,
    Phone,
    ArrowLeft
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/shared'
import {
    quoteAutomationService,
    QuoteAutomationSettings,
    AIProvider
} from '@/lib/services/quote-automation.service'

const AI_PROVIDERS = [
    { value: 'claude', label: 'Claude (Anthropic)', models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'] },
    { value: 'openai', label: 'OpenAI', models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'] },
    { value: 'deepseek', label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] }
]

export default function QuoteAutomationSettingsPage() {
    const router = useRouter()
    const { toast } = useToast()

    const [settings, setSettings] = useState<QuoteAutomationSettings | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [whatsAppInfo, setWhatsAppInfo] = useState<{
        assignedNumber: string | null
        isVerified: boolean
        planName: string
        whatsappEnabled: boolean
        monthlyQuoteLimit: number
        quotesUsed: number
        allowOverage: boolean
    } | null>(null)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            setIsLoading(true)
            const [data, waInfo] = await Promise.all([
                quoteAutomationService.getSettings(),
                quoteAutomationService.getWhatsAppInfo()
            ])
            setSettings(data)
            setWhatsAppInfo(waInfo)
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Error al cargar configuración',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        if (!settings) return

        try {
            setIsSaving(true)
            await quoteAutomationService.updateSettings({
                aiProvider: settings.aiProvider,
                aiModel: settings.aiModel,
                aiTemperature: settings.aiTemperature,
                isEnabled: settings.isEnabled,
                whatsappEnabled: settings.whatsappEnabled,
                emailEnabled: settings.emailEnabled,
                webEnabled: settings.webEnabled,
                dailyQuoteLimit: settings.dailyQuoteLimit,
                autoSendQuote: settings.autoSendQuote,
                includeProductImages: settings.includeProductImages,
                defaultExpiryDays: settings.defaultExpiryDays,
                systemPrompt: settings.systemPrompt,
                greetingMessage: settings.greetingMessage
            })
            setHasChanges(false)
            toast({
                title: 'Guardado',
                description: 'Configuración actualizada correctamente',
            })
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Error al guardar',
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const updateSetting = <K extends keyof QuoteAutomationSettings>(
        key: K,
        value: QuoteAutomationSettings[K]
    ) => {
        if (!settings) return
        setSettings({ ...settings, [key]: value })
        setHasChanges(true)
    }

    const getAvailableModels = () => {
        if (!settings) return []
        const provider = AI_PROVIDERS.find(p => p.value === settings.aiProvider)
        return provider?.models || []
    }

    if (isLoading) {
        return (
            <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-6 w-96" />
                <div className="grid gap-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        )
    }

    if (!settings) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>No se pudo cargar la configuración</AlertDescription>
                </Alert>
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
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <PageHeader
                        title="Automatización de Cotizaciones"
                        subtitle="Configura la generación automática de cotizaciones con IA"
                    />
                </div>
                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Cambios sin guardar
                        </Badge>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                    >
                        {isSaving ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Guardar Cambios
                    </Button>
                </div>
            </div>

            {/* Main Toggle */}
            <Card className="border-2 border-dashed">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${settings.isEnabled
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-400'
                                }`}>
                                <Bot className="h-7 w-7" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Asistente de Cotizaciones IA
                                </h3>
                                <p className="text-muted-foreground">
                                    {settings.isEnabled
                                        ? 'El asistente está activo y procesando solicitudes'
                                        : 'Activa el asistente para empezar a recibir cotizaciones automáticas'}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={settings.isEnabled}
                            onCheckedChange={(checked) => updateSetting('isEnabled', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="channels" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="channels">Canales</TabsTrigger>
                    <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                    <TabsTrigger value="ai">IA</TabsTrigger>
                    <TabsTrigger value="behavior">Comportamiento</TabsTrigger>
                    <TabsTrigger value="prompts">Mensajes</TabsTrigger>
                </TabsList>

                {/* Channels Tab */}
                <TabsContent value="channels" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Canales de Comunicación
                            </CardTitle>
                            <CardDescription>
                                Selecciona por qué canales recibirás solicitudes de cotización
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* WhatsApp */}
                            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                        <Smartphone className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium">WhatsApp</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Recibe y responde cotizaciones por WhatsApp
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.whatsappEnabled}
                                    onCheckedChange={(checked) => updateSetting('whatsappEnabled', checked)}
                                />
                            </div>

                            {settings.whatsappEnabled && (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Configuración de WhatsApp</AlertTitle>
                                    <AlertDescription>
                                        Para usar WhatsApp necesitas configurar un webhook con Twilio o Meta Business API.
                                        Contacta soporte para ayuda con la integración.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Separator />

                            {/* Email */}
                            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <Mail className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium">Email</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Procesa solicitudes de cotización por correo electrónico
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.emailEnabled}
                                    onCheckedChange={(checked) => updateSetting('emailEnabled', checked)}
                                />
                            </div>

                            {settings.emailEnabled && (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Configuración de Email</AlertTitle>
                                    <AlertDescription>
                                        Configura un buzón de correo dedicado para recibir solicitudes.
                                        Ejemplo: cotizaciones@tuempresa.com
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Separator />

                            {/* Web Chat */}
                            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                                        <MessageSquare className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium">Chat Web</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Widget de chat embebido en tu sitio web
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.webEnabled}
                                    onCheckedChange={(checked) => updateSetting('webEnabled', checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* WhatsApp - Centralized Model */}
                <TabsContent value="whatsapp" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Phone className="h-5 w-5 text-green-600" />
                                WhatsApp Business
                            </CardTitle>
                            <CardDescription>
                                Recibe cotizaciones automáticas por WhatsApp
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Plan Info */}
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Plan actual:</span>
                                <Badge variant="outline" className="capitalize">
                                    {whatsAppInfo?.planName || 'free'}
                                </Badge>
                                {whatsAppInfo?.whatsappEnabled ? (
                                    <Badge className="bg-green-100 text-green-800">WhatsApp incluido</Badge>
                                ) : (
                                    <Badge variant="destructive">WhatsApp no incluido</Badge>
                                )}
                            </div>

                            {/* Number Status */}
                            {whatsAppInfo?.assignedNumber ? (
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200">
                                    <CheckCircle className="h-6 w-6 text-green-500" />
                                    <div className="flex-1">
                                        <p className="font-medium text-green-700 dark:text-green-300">WhatsApp Activo</p>
                                        <p className="text-lg font-mono">{whatsAppInfo.assignedNumber}</p>
                                    </div>
                                    {whatsAppInfo.isVerified && (
                                        <Badge className="bg-green-100 text-green-800">Verificado</Badge>
                                    )}
                                </div>
                            ) : whatsAppInfo?.whatsappEnabled ? (
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
                                    <AlertCircle className="h-6 w-6 text-amber-500" />
                                    <div>
                                        <p className="font-medium text-amber-700 dark:text-amber-300">Número pendiente de asignación</p>
                                        <p className="text-sm text-muted-foreground">
                                            Tu plan incluye WhatsApp pero aún no se te ha asignado un número. Contacta al administrador.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border">
                                    <AlertCircle className="h-6 w-6 text-gray-400" />
                                    <div>
                                        <p className="font-medium text-gray-600 dark:text-gray-300">WhatsApp no disponible</p>
                                        <p className="text-sm text-muted-foreground">
                                            Tu plan actual no incluye WhatsApp. Actualiza tu plan para usar esta función.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {/* Monthly Usage */}
                            {whatsAppInfo?.whatsappEnabled && (
                                <div className="grid gap-4">
                                    <div className="flex items-center justify-between">
                                        <Label>Uso mensual de cotizaciones</Label>
                                        <span className="text-sm font-mono text-muted-foreground">
                                            {whatsAppInfo.quotesUsed} / {whatsAppInfo.monthlyQuoteLimit === -1 ? '∞' : whatsAppInfo.monthlyQuoteLimit}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full transition-all"
                                            style={{
                                                width: whatsAppInfo.monthlyQuoteLimit === -1
                                                    ? '10%'
                                                    : `${Math.min(100, (whatsAppInfo.quotesUsed / whatsAppInfo.monthlyQuoteLimit) * 100)}%`
                                            }}
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Cotizaciones usadas este mes vs tu límite del plan
                                    </p>
                                </div>
                            )}

                            {/* Info */}
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>¿Cómo funciona?</AlertTitle>
                                <AlertDescription className="text-sm">
                                    Los clientes envían un mensaje a tu número asignado y el asistente IA les responde
                                    automáticamente, identifica los productos que necesitan, y genera una cotización.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* AI Configuration Tab */}
                <TabsContent value="ai" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                Configuración del Modelo IA
                            </CardTitle>
                            <CardDescription>
                                Selecciona y configura el proveedor de inteligencia artificial
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Provider Selection */}
                            <div className="grid gap-2">
                                <Label>Proveedor de IA</Label>
                                <Select
                                    value={settings.aiProvider}
                                    onValueChange={(value) => {
                                        updateSetting('aiProvider', value as AIProvider)
                                        // Reset model when provider changes
                                        const provider = AI_PROVIDERS.find(p => p.value === value)
                                        if (provider?.models[0]) {
                                            updateSetting('aiModel', provider.models[0])
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AI_PROVIDERS.map(provider => (
                                            <SelectItem key={provider.value} value={provider.value}>
                                                {provider.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Model Selection */}
                            <div className="grid gap-2">
                                <Label>Modelo</Label>
                                <Select
                                    value={settings.aiModel}
                                    onValueChange={(value) => updateSetting('aiModel', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getAvailableModels().map(model => (
                                            <SelectItem key={model} value={model}>
                                                {model}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground">
                                    Modelos más potentes ofrecen mejor comprensión pero mayor costo
                                </p>
                            </div>

                            <Separator />

                            {/* Temperature */}
                            <div className="grid gap-4">
                                <div className="flex items-center justify-between">
                                    <Label>Temperatura (Creatividad)</Label>
                                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                        {settings.aiTemperature.toFixed(1)}
                                    </span>
                                </div>
                                <Slider
                                    value={[settings.aiTemperature]}
                                    onValueChange={([value]) => updateSetting('aiTemperature', value)}
                                    min={0}
                                    max={1}
                                    step={0.1}
                                />
                                <p className="text-sm text-muted-foreground">
                                    0 = Respuestas más precisas y consistentes | 1 = Respuestas más creativas y variadas
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Behavior Tab */}
                <TabsContent value="behavior" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Comportamiento
                            </CardTitle>
                            <CardDescription>
                                Configura cómo funciona el asistente
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Daily Limit */}
                            <div className="grid gap-2">
                                <Label>Límite diario de cotizaciones por cliente</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={settings.dailyQuoteLimit}
                                    onChange={(e) => updateSetting('dailyQuoteLimit', parseInt(e.target.value) || 3)}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Máximo de cotizaciones que un cliente puede solicitar por día
                                </p>
                            </div>

                            <Separator />

                            {/* Default Expiry */}
                            <div className="grid gap-2">
                                <Label>Vigencia de cotizaciones (días)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={90}
                                    value={settings.defaultExpiryDays}
                                    onChange={(e) => updateSetting('defaultExpiryDays', parseInt(e.target.value) || 7)}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Días de vigencia por defecto para las cotizaciones generadas
                                </p>
                            </div>

                            <Separator />

                            {/* Toggles */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Envío automático</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Enviar cotización al cliente sin aprobación manual
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.autoSendQuote}
                                        onCheckedChange={(checked) => updateSetting('autoSendQuote', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Incluir imágenes de productos</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Adjuntar imágenes de los productos en la cotización
                                        </p>
                                    </div>
                                    <Switch
                                        checked={settings.includeProductImages}
                                        onCheckedChange={(checked) => updateSetting('includeProductImages', checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Prompts Tab */}
                <TabsContent value="prompts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Personalización de Mensajes
                            </CardTitle>
                            <CardDescription>
                                Personaliza cómo se comunica el asistente con tus clientes
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Greeting Message */}
                            <div className="grid gap-2">
                                <Label>Mensaje de bienvenida</Label>
                                <Textarea
                                    rows={3}
                                    value={settings.greetingMessage}
                                    onChange={(e) => updateSetting('greetingMessage', e.target.value)}
                                    placeholder="Hola! Soy tu asistente de cotizaciones..."
                                />
                                <p className="text-sm text-muted-foreground">
                                    Primer mensaje que recibe el cliente al iniciar una conversación
                                </p>
                            </div>

                            <Separator />

                            {/* System Prompt */}
                            <div className="grid gap-2">
                                <Label>Instrucciones del sistema (avanzado)</Label>
                                <Textarea
                                    rows={8}
                                    value={settings.systemPrompt || ''}
                                    onChange={(e) => updateSetting('systemPrompt', e.target.value)}
                                    placeholder="Eres un asistente de cotizaciones profesional..."
                                    className="font-mono text-sm"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Instrucciones detalladas para el comportamiento del asistente.
                                    Deja vacío para usar las instrucciones predeterminadas.
                                </p>
                            </div>

                            <Alert>
                                <Shield className="h-4 w-4" />
                                <AlertTitle>Nota de seguridad</AlertTitle>
                                <AlertDescription>
                                    El asistente solo puede buscar productos de tu catálogo y crear cotizaciones.
                                    No puede modificar precios, inventario ni acceder a información sensible.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
