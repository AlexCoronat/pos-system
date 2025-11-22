"use client"

import { DailySalesData } from "@/lib/services/reports.service"
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils" // Assuming this exists, if not I'll use Intl

interface SalesTrendChartProps {
    data: DailySalesData[]
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
    // Format date for display
    const formattedData = data.map(item => ({
        ...item,
        formattedDate: new Date(item.sale_date).toLocaleDateString('es-MX', {
            month: 'short',
            day: 'numeric'
        })
    }))

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Tendencia de Ventas</CardTitle>
                <CardDescription>
                    Ingresos diarios de los últimos 30 días
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedData}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="formattedDate"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <Tooltip
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ventas']}
                                labelFormatter={(label) => `Fecha: ${label}`}
                            />
                            <Area
                                type="monotone"
                                dataKey="total_sales"
                                stroke="#0ea5e9"
                                fillOpacity={1}
                                fill="url(#colorSales)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
