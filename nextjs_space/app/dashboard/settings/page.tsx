'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  Settings,
  MapPin,
  UserCog,
  Building2,
  CreditCard,
  Bell,
  Shield,
  ChevronRight,
  Keyboard,
  Wallet,
  Sliders,
  Layout,
  Bot,
  Phone,
  Clock,
  Search,
  Store,
  Users,
  Cpu
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared'

// Define types for the settings structure
type SettingsItem = {
  title: string
  description: string
  href: string
  icon: any
  color: string
  disabled?: boolean
  titleKey?: string
  descriptionKey?: string
}

type SettingsGroup = {
  id: string
  title: string
  icon: any
  items: SettingsItem[]
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const [searchQuery, setSearchQuery] = useState('')

  // Define categorized settings
  const settingsGroups: SettingsGroup[] = [
    {
      id: 'general',
      title: 'General y Empresa',
      icon: Building2,
      items: [
        {
          title: 'Configuración Local de Equipo',
          description: 'Configura impresora, cajas y comportamiento local del POS',
          href: '/dashboard/settings/preferences',
          icon: Sliders,
          color: 'text-pink-600 bg-pink-100'
        },
        {
          titleKey: 'sections.company.title',
          descriptionKey: 'sections.company.description', // "Configura la información de la empresa"
          title: 'Empresa', // Fallback
          description: 'Gestiona los datos de tu empresa', // Fallback
          href: '/dashboard/settings/company',
          icon: Building2,
          color: 'text-purple-600 bg-purple-100'
        },
        {
          titleKey: 'sections.notifications.title',
          descriptionKey: 'sections.notifications.description',
          title: 'Notificaciones',
          description: 'Gestiona tus preferencias de notificaciones',
          href: '/dashboard/settings/notifications',
          icon: Bell,
          color: 'text-yellow-600 bg-yellow-100'
        }
      ]
    },
    {
      id: 'pos',
      title: 'Punto de Venta (Operativo)',
      icon: Store,
      items: [
        {
          title: 'Layout POS',
          description: 'Configura qué elementos mostrar en la pantalla de ventas',
          href: '/dashboard/settings/pos-layout',
          icon: Layout,
          color: 'text-cyan-600 bg-cyan-100'
        },
        {
          title: 'Configuración de Turnos',
          description: 'Configura si se requieren turnos y su duración',
          href: '/dashboard/settings/shift-config',
          icon: Clock,
          color: 'text-amber-600 bg-amber-100'
        },
        {
          title: 'Cajas Registradoras',
          description: 'Gestiona las cajas del punto de venta',
          href: '/dashboard/settings/cash-registers',
          icon: Wallet,
          color: 'text-emerald-600 bg-emerald-100'
        },
        {
          title: 'Atajos de Teclado',
          description: 'Personaliza los atajos de teclado del sistema',
          href: '/dashboard/settings/shortcuts',
          icon: Keyboard,
          color: 'text-blue-600 bg-blue-100'
        }
      ]
    },
    {
      id: 'team',
      title: 'Equipo y Seguridad',
      icon: Users,
      items: [
        {
          titleKey: 'sections.team.title',
          descriptionKey: 'sections.team.description',
          title: 'Equipo',
          description: 'Gestiona los miembros de tu equipo',
          href: '/dashboard/settings/team',
          icon: UserCog,
          color: 'text-indigo-600 bg-indigo-100'
        },
        {
          titleKey: 'sections.roles.title',
          descriptionKey: 'sections.roles.description',
          title: 'Roles y Permisos',
          description: 'Configura los roles de usuario',
          href: '/dashboard/settings/roles',
          icon: Shield,
          color: 'text-violet-600 bg-violet-100'
        },
      ]
    },
    {
      id: 'integrations',
      title: 'Integraciones y Sistema',
      icon: Cpu,
      items: [
        {
          title: 'Automatización Cotizaciones',
          description: 'Configura la generación automática de cotizaciones con IA',
          href: '/dashboard/settings/quote-automation',
          icon: Bot,
          color: 'text-emerald-600 bg-emerald-100',
          disabled: true
        },
        {
          title: 'Admin WhatsApp',
          description: 'Gestiona el pool de números WhatsApp y asignaciones',
          href: '/dashboard/settings/whatsapp-admin',
          icon: Phone,
          color: 'text-green-600 bg-green-100',
          disabled: true
        },
        {
          titleKey: 'sections.payments.title',
          descriptionKey: 'sections.payments.description',
          title: 'Pagos',
          description: 'Configura los métodos de pago',
          href: '/dashboard/settings/payments',
          icon: CreditCard,
          color: 'text-orange-600 bg-orange-100',
          disabled: true
        }
      ]
    }
  ]

  // Filter groups based on search
  const filteredGroups = settingsGroups.map(group => {
    const filteredItems = group.items.filter(item => {
      const title = item.titleKey ? t(item.titleKey) : item.title
      const description = item.descriptionKey ? t(item.descriptionKey) : item.description
      const query = searchQuery.toLowerCase()

      return title.toLowerCase().includes(query) || description.toLowerCase().includes(query)
    })

    return {
      ...group,
      items: filteredItems
    }
  }).filter(group => group.items.length > 0)

  return (
    <div className="p-6 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
        />
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Buscar configuración..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Settings Groups */}
      {filteredGroups.length > 0 ? (
        <div className="space-y-10">
          {filteredGroups.map((group) => (
            <div key={group.id} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
                <group.icon className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {group.title}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.items.map((section) => (
                  <Card
                    key={section.titleKey || section.title}
                    className={`transition-all rounded-xl border shadow-sm hover:shadow-md h-full ${section.disabled
                      ? 'opacity-50 cursor-not-allowed bg-gray-50'
                      : 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                  >
                    {section.disabled ? (
                      <div className="p-6 h-full flex flex-col">
                        <CardHeader className="p-0 pb-4 flex-1">
                          <div className="flex items-center justify-between">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                              <section.icon className="h-6 w-6" />
                            </div>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {t('sections.company.comingSoon')}
                            </span>
                          </div>
                          <CardTitle className="mt-4 text-base">
                            {section.titleKey ? t(section.titleKey) : section.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {section.descriptionKey ? t(section.descriptionKey) : section.description}
                          </CardDescription>
                        </CardHeader>
                      </div>
                    ) : (
                      <Link href={section.href} className="h-full block">
                        <CardHeader className="p-6 h-full flex flex-col">
                          <div className="flex items-center justify-between">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                              <section.icon className="h-6 w-6" />
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 mt-4">
                            <CardTitle className="text-base">
                              {section.titleKey ? t(section.titleKey) : section.title}
                            </CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">
                              {section.descriptionKey ? t(section.descriptionKey) : section.description}
                            </CardDescription>
                          </div>
                        </CardHeader>
                      </Link>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Search className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium">No se encontraron resultados</h3>
          <p>Intenta con otra búsqueda</p>
        </div>
      )}
    </div>
  )
}
