'use client'

import Link from 'next/link'
import {
  Settings,
  MapPin,
  Users,
  UserCog,
  Building2,
  CreditCard,
  Bell,
  Shield,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const settingsSections = [
  {
    title: 'Equipo',
    description: 'Agrega usuarios y asigna roles a tu equipo',
    href: '/dashboard/settings/team',
    icon: UserCog,
    color: 'text-indigo-600 bg-indigo-100'
  },
  {
    title: 'Roles y Permisos',
    description: 'Crea roles personalizados con permisos',
    href: '/dashboard/settings/roles',
    icon: Shield,
    color: 'text-violet-600 bg-violet-100'
  },
  {
    title: 'Ubicaciones',
    description: 'Gestiona las sucursales y puntos de venta',
    href: '/dashboard/settings/locations',
    icon: MapPin,
    color: 'text-blue-600 bg-blue-100'
  },
  {
    title: 'Usuarios y Ubicaciones',
    description: 'Asigna usuarios a ubicaciones',
    href: '/dashboard/settings/users',
    icon: Users,
    color: 'text-green-600 bg-green-100'
  },
  {
    title: 'Datos de la Empresa',
    description: 'Informacion fiscal y de contacto',
    href: '/dashboard/settings/company',
    icon: Building2,
    color: 'text-purple-600 bg-purple-100',
    disabled: true
  },
  {
    title: 'Metodos de Pago',
    description: 'Configura los metodos de pago aceptados',
    href: '/dashboard/settings/payments',
    icon: CreditCard,
    color: 'text-orange-600 bg-orange-100',
    disabled: true
  },
  {
    title: 'Notificaciones',
    description: 'Alertas de stock, ventas y mas',
    href: '/dashboard/settings/notifications',
    icon: Bell,
    color: 'text-yellow-600 bg-yellow-100',
    disabled: true
  },
  {
    title: 'Seguridad',
    description: 'Configuracion de seguridad y sesiones',
    href: '/dashboard/settings/security',
    icon: Shield,
    color: 'text-red-600 bg-red-100',
    disabled: true
  }
]

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8" />
          Configuracion
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra la configuracion del sistema
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => (
          <Card
            key={section.title}
            className={`transition-all ${
              section.disabled
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
                      Proximamente
                    </span>
                  </div>
                  <CardTitle className="mt-4">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
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
                  <CardTitle className="mt-4">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Link>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
