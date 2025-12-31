"use client"

import { useEffect, useState } from "react"
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/lib/utils/formatters'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SalesTrendChart } from "@/components/reports/SalesTrendChart"
import { TopProductsChart } from "@/components/reports/TopProductsChart"
import { reportsService, DailySalesData, TopProductData } from "@/lib/services/reports.service"
import { useAuth } from "@/lib/hooks/use-auth"
import { Loader2, DollarSign, CreditCard, TrendingUp, Calendar, ShoppingCart } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { StatsCard, PageHeader, LoadingState, BrandButton } from '@/components/shared'
import { useBranding } from '@/lib/contexts/BrandingContext'
import { pdf } from "@react-pdf/renderer"
import { ReportsDocument } from "@/components/reports/ReportsDocument"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function ReportsPage() {
    const t = useTranslations('reports')
    const tCommon = useTranslations('common')
    const { formatCurrency } = useFormatters()
    const { user } = useAuth()
    const { toast } = useToast()
    const { branding } = useBranding()
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

    const handleDownloadPDF = async () => {
        try {
            setLoading(true)

            // Prepare strings
            const strings = {
                title: t('title'),
                date: tCommon('date'),
                last30Days: t('filters.last30Days'),
                summary: tCommon('summary'),
                totalSales: t('summary.totalSales'),
                transactions: t('summary.transactions'),
                completedSales: t('summary.completedSales'),
                avgTicket: t('summary.avgTicket'),
                perTransaction: t('summary.perTransaction'),
                salesTrend: t('charts.salesTrend'),
                topProducts: t('charts.topProducts'),
                product: t('items.product'),
                quantitySold: t('charts.quantitySold'),
                sales: t('charts.sales'),
                details: tCommon('details'),
            }

            const blob = await pdf(
                <ReportsDocument
                    data={{ summary, dailySales, topProducts }}
                    strings={strings}
                    companyName={user?.businessName || 'Mi Empresa'}
                    primaryColor={branding.primaryColor}
                />
            ).toBlob()

            // Create URL and trigger download
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `reporte-ventas-${new Date().toISOString().split('T')[0]}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

        } catch (error) {
            console.error("Error generating PDF:", error)
            toast({
                title: tCommon("error"),
                description: t("messages.error"),
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <LoadingState message={t('messages.loading')} minHeight="h-full" />
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <PageHeader
                title={t('title')}
                actions={
                    <>
                        <BrandButton variant="outline" disabled>
                            <Calendar className="mr-2 h-4 w-4" />
                            {t('filters.last30Days')}
                        </BrandButton>
                        <BrandButton onClick={handleDownloadPDF}>
                            <Loader2 className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : 'hidden'}`} />
                            {t('export.pdf')}
                        </BrandButton>
                    </>
                }
            />


            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <StatsCard
                    title={t('summary.totalSales')}
                    value={formatCurrency(summary.totalSales)}
                    icon={DollarSign}
                    color="blue"
                    subtitle={t('filters.last30Days')}
                />
                <StatsCard
                    title={t('summary.transactions')}
                    value={summary.totalTransactions}
                    icon={ShoppingCart}
                    color="emerald"
                    subtitle={t('summary.completedSales')}
                />
                <StatsCard
                    title={t('summary.avgTicket')}
                    value={formatCurrency(summary.avgTicket)}
                    icon={TrendingUp}
                    color="violet"
                    subtitle={t('summary.perTransaction')}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <SalesTrendChart data={dailySales} />
                <TopProductsChart data={topProducts} />
            </div>
        </div>
    )
}
