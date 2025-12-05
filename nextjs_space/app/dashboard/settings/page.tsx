'use client'

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
  Sliders
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PageHeader } from '@/components/shared'

export default function SettingsPage() {
  const t = useTranslations('settings')

  const settingsSections = [
    {
      title: 'Preferencias',
      description: 'Personaliza el tema, idioma y configuración personal',
      href: '/dashboard/settings/preferences',
      icon: Sliders,
      color: 'text-pink-600 bg-pink-100'
    },
    {
      titleKey: 'sections.team.title',
      descriptionKey: 'sections.team.description',
      href: '/dashboard/settings/team',
      icon: UserCog,
      color: 'text-indigo-600 bg-indigo-100'
    },
    {
      titleKey: 'sections.roles.title',
      descriptionKey: 'sections.roles.description',
      href: '/dashboard/settings/roles',
      icon: Shield,
      color: 'text-violet-600 bg-violet-100'
    },
    {
      titleKey: 'sections.company.title',
      descriptionKey: 'sections.company.description',
      href: '/dashboard/settings/company',
      icon: Building2,
      color: 'text-purple-600 bg-purple-100'
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
    },
    {
      titleKey: 'sections.payments.title',
      descriptionKey: 'sections.payments.description',
      href: '/dashboard/settings/payments',
      icon: CreditCard,
      color: 'text-orange-600 bg-orange-100',
      disabled: true
    },
    {
      titleKey: 'sections.notifications.title',
      descriptionKey: 'sections.notifications.description',
      href: '/dashboard/settings/notifications',
      icon: Bell,
      color: 'text-yellow-600 bg-yellow-100',
      disabled: true
    },
    {
      titleKey: 'sections.security.title',
      descriptionKey: 'sections.security.description',
      href: '/dashboard/settings/security',
      icon: Shield,
      color: 'text-red-600 bg-red-100',
      disabled: true
    }
  ]

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsSections.map((section) => (
          <Card
            key={section.titleKey || section.title}
            className={`transition-all rounded-xl border shadow-sm hover:shadow-md ${section.disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700'
              }`}
          >
            {section.disabled ? (
              <div className="p-6">
                <CardHeader className="p-0 pb-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                      <section.icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {t('sections.company.comingSoon')}
                    </span>
                  </div>
                  <CardTitle className="mt-4">{t(section.titleKey)}</CardTitle>
                  <CardDescription>{t(section.descriptionKey)}</CardDescription>
                </CardHeader>
              </div>
            ) : (
              <Link href={section.href}>
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${section.color}`}>
                      <section.icon className="h-6 w-6" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="mt-4">{section.titleKey ? t(section.titleKey) : section.title}</CardTitle>
                  <CardDescription>{section.descriptionKey ? t(section.descriptionKey) : section.description}</CardDescription>
                </CardHeader>
              </Link>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
