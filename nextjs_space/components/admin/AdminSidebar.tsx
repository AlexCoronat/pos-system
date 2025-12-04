/**
 * Admin Sidebar Component  
 * Collapsible sidebar for admin view with full navigation
 */

'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSidebarCollapsed, useViewStore } from '@/lib/stores/view-store'
import { CompanyLogo } from '@/components/shared'
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    FileText,
    TrendingUp,
    Settings,
    MapPin,
    User,
    Building2,
    UsersRound,
    Shield,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'

interface NavItem {
    name: string
    href: string
    icon: any
    section?: 'main' | 'settings'
    permissions?: string[]
    roles?: string[]
}

const navigationItems: NavItem[] = [
    // Main section
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'main' },
    {
        name: 'Ventas',
        href: '/dashboard/pos',
        icon: ShoppingCart,
        section: 'main',
        permissions: ['sales:read']
    },
    {
        name: 'Inventario',
        href: '/dashboard/inventory',
        icon: Package,
        section: 'main',
        permissions: ['inventory:read']
    },
    {
        name: 'Clientes',
        href: '/dashboard/customers',
        icon: Users,
        section: 'main',
        permissions: ['customers:read']
    },
    {
        name: 'Cotizaciones',
        href: '/dashboard/quotes',
        icon: FileText,
        section: 'main'
    },
    {
        name: 'Reportes',
        href: '/dashboard/reports',
        icon: TrendingUp,
        section: 'main',
        permissions: ['reports:read']
    },

    // Settings section
    {
        name: 'Empresa',
        href: '/dashboard/settings/company',
        icon: Building2,
        section: 'settings',
        roles: ['Admin']
    },
    {
        name: 'Equipo',
        href: '/dashboard/settings/team',
        icon: UsersRound,
        section: 'settings',
        roles: ['Admin', 'Manager']
    },
    {
        name: 'Roles',
        href: '/dashboard/settings/roles',
        icon: Shield,
        section: 'settings',
        roles: ['Admin']
    },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const { user, hasPermission, hasRole } = useAuth()
    const collapsed = useSidebarCollapsed()
    const { toggleSidebar } = useViewStore()

    const canAccessRoute = (item: NavItem): boolean => {
        if (user?.roleName === 'Admin') return true
        if (item.roles && !hasRole(...item.roles)) return false
        if (item.permissions && !item.permissions.some(p => hasPermission(p))) return false
        return true
    }

    const filteredNavigation = navigationItems.filter(canAccessRoute)
    const mainNav = filteredNavigation.filter(item => item.section === 'main' || !item.section)
    const settingsNav = filteredNavigation.filter(item => item.section === 'settings')

    return (
        <div
            className={`
        fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 
        transition-all duration-300 flex flex-col
        ${collapsed ? 'w-20' : 'w-64'}
      `}
        >
            {/* Logo and brand */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
                {!collapsed && (
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <CompanyLogo size="sm" showName={true} />
                    </Link>
                )}

                {collapsed && (
                    <div className="w-full flex justify-center">
                        <CompanyLogo size="sm" showName={false} />
                    </div>
                )}
            </div>

            {/* Location selector */}
            <div className={`px-3 py-3 border-b border-gray-200 ${collapsed ? 'hidden' : 'block'}`}>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {!collapsed && (
                        <select className="text-sm text-gray-700 bg-transparent border-none w-full focus:ring-0 cursor-pointer">
                            {user?.assignedLocations && user.assignedLocations.length > 0 ? (
                                user.assignedLocations.map((loc) => (
                                    <option key={loc.locationId} value={loc.locationId}>
                                        {loc.location.name}
                                    </option>
                                ))
                            ) : (
                                <option>{user?.locationName || 'Sin ubicación'}</option>
                            )}
                        </select>
                    )}
                </div>
            </div>

            {/* Main navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
                {/* Main items */}
                <div className="space-y-1">
                    {mainNav.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                  ${isActive
                                        ? 'bg-brand-primary/10 text-brand-primary font-medium border-l-4'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }
                  ${collapsed ? 'justify-center' : ''}
                `}
                                title={collapsed ? item.name : undefined}
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                {!collapsed && <span className="text-sm">{item.name}</span>}
                            </Link>
                        )
                    })}
                </div>

                {/* Settings section */}
                {settingsNav.length > 0 && (
                    <>
                        <div className={`mt-6 mb-2 px-3 ${collapsed ? 'hidden' : 'block'}`}>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Configuración
                            </h3>
                        </div>
                        <div className="space-y-1">
                            {settingsNav.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`
                      flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                      ${isActive
                                                ? 'bg-brand-primary/10 text-brand-primary font-medium border-l-4'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                                        title={collapsed ? item.name : undefined}
                                    >
                                        <item.icon className="w-5 h-5 flex-shrink-0" />
                                        {!collapsed && <span className="text-sm">{item.name}</span>}
                                    </Link>
                                )
                            })}
                        </div>
                    </>
                )}
            </nav>



            {/* User section */}
            <div className="p-3 border-t border-gray-200">
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-gray-600" />
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user?.roleName}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Collapse toggle button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm transition-all"
                aria-label={collapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
            >
                {collapsed ? (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                ) : (
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                )}
            </button>
        </div>
    )
}
