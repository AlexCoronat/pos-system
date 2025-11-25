"use client"

import { useEffect, useState } from "react"
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/lib/utils/formatters'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SalesTrendChart } from "@/components/reports/SalesTrendChart"
import { TopProductsChart } from "@/components/reports/TopProductsChart"
import { reportsService, DailySalesData, TopProductData } from "@/lib/services/reports.service"
import { useAuth } from "@/lib/hooks/use-auth"
import { Loader2, DollarSign, CreditCard, TrendingUp, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export default function ReportsPage() {
    const t = useTranslations('reports')
    const tCommon = useTranslations('common')
    const { formatCurrency } = useFormatters()
    const { user } = useAuth()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [dailySales, setDailySales] = useState<DailySalesData[]>([])
    const [topProducts, setTopProducts] = useState<TopProductData[]>([])
    const [summary, setSummary] = useState({
        totalSales: 0,
        totalTransactions: 0,
        avgTicket: 0
    })

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.businessId) return

            try {
                setLoading(true)
                // Date range: Last 30 days
                const endDate = new Date().toISOString().split('T')[0]
                const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

                const [salesData, productsData] = await Promise.all([
                    reportsService.getDailySales(user.businessId, startDate, endDate),
                    reportsService.getTopSellingProducts(user.businessId)
                ])

                setDailySales(salesData)
                setTopProducts(productsData)

                // Calculate summary
                const totalSales = salesData.reduce((acc, curr) => acc + curr.total_sales, 0)
                const totalTransactions = salesData.reduce((acc, curr) => acc + curr.total_transactions, 0)
                const avgTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0

                setSummary({
                    totalSales,
                    totalTransactions,
                    avgTicket
                })

            } catch (error) {
                console.error("Error loading reports:", error)
                toast({
                    title: tCommon('error'),
                    description: t('messages.error'),
                    variant: "destructive"
                })
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [user?.businessId, toast])

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" disabled>
                        <Calendar className="mr-2 h-4 w-4" />
                        {t('filters.last30Days')}
                    </Button>
                    <Button>{t('export.pdf')}</Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('summary.totalSales')}
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(summary.totalSales)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('filters.last30Days')}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('summary.transactions')}
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalTransactions}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('summary.completedSales')}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('summary.avgTicket')}
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(summary.avgTicket)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('summary.perTransaction')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <SalesTrendChart data={dailySales} />
                <TopProductsChart data={topProducts} />
            </div>
        </div>
    )
}
