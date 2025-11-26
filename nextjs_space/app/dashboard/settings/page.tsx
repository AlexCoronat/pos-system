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
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function SettingsPage() {
  const t = useTranslations('settings')

  const settingsSections = [
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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-900 dark:text-gray-100">
          <Settings className="h-8 w-8" />
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => (
          <Card
            key={section.titleKey}
            className={`transition-all ${section.disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:shadow-md cursor-pointer'
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
                  <CardTitle className="mt-4">{t(section.titleKey)}</CardTitle>
                  <CardDescription>{t(section.descriptionKey)}</CardDescription>
                </CardHeader>
              </Link>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
