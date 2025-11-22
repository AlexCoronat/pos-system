"use client"

import { TopProductData } from "@/lib/services/reports.service"
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    Cell
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface TopProductsChartProps {
    data: TopProductData[]
}

export function TopProductsChart({ data }: TopProductsChartProps) {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Productos Más Vendidos</CardTitle>
                <CardDescription>
                    Top 5 productos por ingresos
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data.slice(0, 5)}>
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="product_name"
                                type="category"
                                width={100}
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Bar dataKey="total_revenue" radius={[0, 4, 4, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index < 3 ? "#0ea5e9" : "#94a3b8"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
