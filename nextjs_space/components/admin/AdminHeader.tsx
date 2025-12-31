'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { ShiftStatus } from '@/components/pos/ShiftStatus'
import { useShiftModals } from '@/lib/contexts/shift-modals-context'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Settings, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function AdminHeader() {
    const { user } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()
    const shiftModals = useShiftModals()

    // Check if we're on the POS page
    const isPOSPage = pathname === '/dashboard/pos'

    // Get time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Buenos días'
        if (hour < 19) return 'Buenas tardes'
        return 'Buenas noches'
    }

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            toast.success('Sesión cerrada correctamente')
            router.push('/auth/login')
        } catch (error) {
            toast.error('Error al cerrar sesión')
        }
    }

    return (
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            {/* Left side - Show greeting on non-POS pages, ShiftStatus on POS page */}
            {/* Left side - Show greeting on non-POS pages, ShiftStatus on POS page */}
            <div>
                {!isPOSPage ? (
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            {getGreeting()}, {user?.firstName}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Bienvenido de vuelta a tu dashboard
                        </p>
                    </div>
                ) : (
                    <ShiftStatus
                        onOpenShift={shiftModals.openOpenShiftModal}
                        onCloseShift={shiftModals.openCloseShiftModal}
                        onAddMovement={shiftModals.openMovementModal}
                        onCashReconciliation={shiftModals.openCashReconciliation}
                    />
                )}
            </div>

            <div className="flex items-center gap-3">
                {/* Notifications */}
                <NotificationBell />

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium hidden sm:inline">
                                {user?.firstName || 'Usuario'}
                            </span>
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div className="flex flex-col">
                                <span className="font-semibold">{user?.firstName} {user?.lastName}</span>
                                <span className="text-xs text-gray-500 font-normal">{user?.email}</span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                            <User className="h-4 w-4 mr-2" />
                            Mi Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                            <Settings className="h-4 w-4 mr-2" />
                            Configuración
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                            <LogOut className="h-4 w-4 mr-2" />
                            Cerrar Sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}

