/**
 * Services Grid Component
 * Displays available services in POS for selling
 */

'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Plus, Clock, Calendar } from 'lucide-react'
import { useCartStore } from '@/lib/stores/cart-store'
import { supabase } from '@/lib/supabase/client'
import { getBusinessContext } from '@/lib/utils/business-context'

interface Service {
    id: number
    name: string
    sku: string
    price: number
    durationMinutes: number | null
    requiresAppointment: boolean
    categoryName: string | null
}

export function ServicesGrid() {
    const [services, setServices] = useState<Service[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const addItem = useCartStore(state => state.addItem)

    useEffect(() => {
        loadServices()
    }, [])

    const loadServices = async () => {
        setIsLoading(true)
        try {
            const { businessId } = await getBusinessContext()

            const { data, error } = await supabase
                .from('products')
                .select(`
                    id,
                    name,
                    sku,
                    selling_price,
                    duration_minutes,
                    requires_appointment,
                    categories:category_id (name)
                `)
                .eq('business_id', businessId)
                .eq('is_service', true)
                .eq('is_active', true)
                .order('name')

            if (error) throw error

            const mappedServices = (data || []).map(item => ({
                id: item.id,
                name: item.name,
                sku: item.sku,
                price: item.selling_price || 0,
                durationMinutes: item.duration_minutes,
                requiresAppointment: item.requires_appointment,
                categoryName: (item.categories as any)?.name || null
            }))

            setServices(mappedServices)
        } catch (error) {
            console.error('Error loading services:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddService = (service: Service) => {
        try {
            addItem({
                productId: service.id,
                productName: service.name,
                productSku: service.sku,
                quantity: 1,
                unitPrice: service.price,
                availableStock: 9999, // Services don't have stock limits
                discountPercentage: 0,
                taxPercentage: 16
            })
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error al agregar servicio')
        }
    }

    if (isLoading) {
        return (
            <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Servicios Disponibles
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-gray-200 rounded-lg h-32 animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    if (services.length === 0) {
        return (
            <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Servicios Disponibles
                </h2>
                <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
                    <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                        No hay servicios configurados
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        Crea un producto marcado como &quot;servicio&quot; en el inventario
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Servicios Disponibles
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {services.map((service) => (
                    <div
                        key={service.id}
                        onClick={() => handleAddService(service)}
                        className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 cursor-pointer hover:shadow-md hover:bg-indigo-100 transition-all group"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200">
                                <Briefcase className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                                    <Plus className="h-4 w-4 text-white" />
                                </div>
                            </div>
                        </div>

                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                            {service.name}
                        </h3>

                        {service.categoryName && (
                            <p className="text-xs text-gray-500 mb-2">{service.categoryName}</p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            {service.durationMinutes && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                                    <Clock className="h-3 w-3" />
                                    {service.durationMinutes} min
                                </span>
                            )}
                            {service.requiresAppointment && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                    <Calendar className="h-3 w-3" />
                                    Cita
                                </span>
                            )}
                        </div>

                        <div className="text-lg font-bold text-indigo-600">
                            ${service.price.toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
