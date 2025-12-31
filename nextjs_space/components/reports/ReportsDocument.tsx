import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Line, Path, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Define styles
const styles = StyleSheet.create({
    page: {
        padding: 30,
        paddingBottom: 50,
        backgroundColor: '#ffffff',
        fontFamily: 'Helvetica',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
        borderBottomWidth: 2,
        borderBottomColor: '#3b82f6',
        paddingBottom: 10,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    companyName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 3,
    },
    subtitle: {
        fontSize: 10,
        color: '#64748b',
    },
    dateLabel: {
        fontSize: 9,
        color: '#94a3b8',
        marginBottom: 2,
    },
    dateValue: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    section: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
        paddingBottom: 3,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    cardsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    card: {
        flex: 1,
        padding: 8,
        backgroundColor: '#f8fafc',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 9,
        color: '#64748b',
        textTransform: 'uppercase',
    },
    cardBadge: {
        fontSize: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    cardBadgePositive: {
        backgroundColor: '#dcfce7',
        color: '#166534',
    },
    cardBadgeNeutral: {
        backgroundColor: '#f1f5f9',
        color: '#64748b',
    },
    cardValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4,
    },
    cardSub: {
        fontSize: 8,
        color: '#94a3b8',
    },
    chartContainer: {
        backgroundColor: '#f8fafc',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 10,
        marginBottom: 10,
    },
    topProductRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    rankBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    rankText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 10,
        color: '#1e293b',
        marginBottom: 2,
    },
    productStats: {
        flexDirection: 'row',
        gap: 10,
    },
    productStat: {
        fontSize: 8,
        color: '#64748b',
    },
    productRevenue: {
        width: 80,
        alignItems: 'flex-end',
    },
    revenueValue: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    revenuePercent: {
        fontSize: 8,
        color: '#3b82f6',
    },
    table: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 6,
        overflow: 'hidden',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        padding: 8,
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: '#f1f5f9',
    },
    tableCell: {
        fontSize: 9,
        color: '#334155',
    },
    textRight: {
        textAlign: 'right',
    },
    textCenter: {
        textAlign: 'center',
    },
    flex1: { flex: 1 },
    flex2: { flex: 2 },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 10,
    },
    footerText: {
        fontSize: 8,
        color: '#94a3b8',
    },
    footerPage: {
        fontSize: 9,
        color: '#64748b',
    },
    confidential: {
        fontSize: 8,
        color: '#ef4444',
        fontWeight: 'bold',
    },
});

// Types
interface ReportsDocumentProps {
    data: {
        summary: {
            totalSales: number;
            totalTransactions: number;
            avgTicket: number;
        };
        dailySales: any[];
        topProducts: any[];
    };
    strings: {
        title: string;
        date: string;
        last30Days: string;
        summary: string;
        totalSales: string;
        transactions: string;
        completedSales: string;
        avgTicket: string;
        perTransaction: string;
        salesTrend: string;
        topProducts: string;
        product: string;
        quantitySold: string;
        sales: string;
        details: string;
    };
    companyName?: string;
    logoUrl?: string;
    primaryColor?: string;
}

const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

export const ReportsDocument: React.FC<ReportsDocumentProps> = ({
    data,
    strings,
    companyName = 'Mi Empresa',
    logoUrl,
    primaryColor = '#3b82f6'
}) => {
    const { summary, dailySales, topProducts } = data;
    const today = format(new Date(), "PPP", { locale: es });
    const totalProductRevenue = topProducts.reduce((acc, p) => acc + (p.total_revenue || 0), 0);

    // Calculate average daily sales for comparison
    const avgDailySales = dailySales.length > 0
        ? dailySales.reduce((acc, d) => acc + d.total_sales, 0) / dailySales.length
        : 0;

    // Calculate "trend" - compare last 7 days avg vs previous 7 days avg
    const last7Days = dailySales.slice(-7);
    const prev7Days = dailySales.slice(-14, -7);
    const last7Avg = last7Days.length > 0 ? last7Days.reduce((acc, d) => acc + d.total_sales, 0) / last7Days.length : 0;
    const prev7Avg = prev7Days.length > 0 ? prev7Days.reduce((acc, d) => acc + d.total_sales, 0) / prev7Days.length : 0;
    const trendPercent = prev7Avg > 0 ? ((last7Avg - prev7Avg) / prev7Avg) * 100 : 0;

    // Executive insights
    const bestDay = dailySales.length > 0
        ? dailySales.reduce((best, d) => d.total_sales > best.total_sales ? d : best, dailySales[0])
        : null;
    const topProduct = topProducts.length > 0 ? topProducts[0] : null;
    const trendDirection = trendPercent >= 0 ? 'aumentaron' : 'disminuyeron';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header with Company Info */}
                <View style={[styles.header, { borderBottomColor: primaryColor }]}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.companyName}>{companyName}</Text>
                        <Text style={styles.title}>{strings.title}</Text>
                        <Text style={styles.subtitle}>{strings.last30Days}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.dateLabel}>Fecha de generación</Text>
                        <Text style={styles.dateValue}>{today}</Text>
                    </View>
                </View>

                {/* Executive Insights */}
                <View style={{
                    backgroundColor: '#f0f9ff',
                    borderLeftWidth: 3,
                    borderLeftColor: primaryColor,
                    padding: 10,
                    marginBottom: 12,
                    borderRadius: 4
                }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 }}>
                        📊 Resumen Ejecutivo
                    </Text>
                    <Text style={{ fontSize: 9, color: '#475569', lineHeight: 1.4 }}>
                        Las ventas {trendDirection} un {Math.abs(trendPercent).toFixed(1)}% respecto a la semana anterior.
                        {bestDay && ` El mejor día fue el ${format(new Date(bestDay.sale_date), "d 'de' MMMM", { locale: es })} con ${formatMoney(bestDay.total_sales)}.`}
                        {topProduct && ` El producto estrella es "${topProduct.product_name}" con ${formatMoney(topProduct.total_revenue)} en ventas.`}
                    </Text>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{strings.summary}</Text>
                    <View style={styles.cardsContainer}>
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{strings.totalSales}</Text>
                                <Text style={[styles.cardBadge, trendPercent >= 0 ? styles.cardBadgePositive : styles.cardBadgeNeutral]}>
                                    {trendPercent >= 0 ? '↑' : '↓'} {Math.abs(trendPercent).toFixed(1)}%
                                </Text>
                            </View>
                            <Text style={styles.cardValue}>{formatMoney(summary.totalSales)}</Text>
                            <Text style={styles.cardSub}>vs promedio semanal anterior</Text>
                        </View>
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{strings.transactions}</Text>
                            </View>
                            <Text style={styles.cardValue}>{summary.totalTransactions}</Text>
                            <Text style={styles.cardSub}>{strings.completedSales}</Text>
                        </View>
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{strings.avgTicket}</Text>
                            </View>
                            <Text style={styles.cardValue}>{formatMoney(summary.avgTicket)}</Text>
                            <Text style={styles.cardSub}>{strings.perTransaction}</Text>
                        </View>
                    </View>
                </View>

                {/* Sales Trend Chart */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{strings.salesTrend}</Text>
                    <View style={[styles.chartContainer, { flexDirection: 'row', padding: 0, height: 130 }]}>
                        {dailySales.length > 0 ? (
                            <>
                                {/* Y-Axis Labels */}
                                <View style={{ width: 50, justifyContent: 'space-between', paddingVertical: 10, paddingRight: 5, alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 8, color: '#94a3b8' }}>{formatMoney(Math.max(...dailySales.map(d => d.total_sales)))}</Text>
                                    <Text style={{ fontSize: 8, color: '#94a3b8' }}>{formatMoney(Math.max(...dailySales.map(d => d.total_sales)) * 0.5)}</Text>
                                    <Text style={{ fontSize: 8, color: '#94a3b8' }}>$0</Text>
                                </View>

                                <View style={{ flex: 1, flexDirection: 'column', paddingRight: 10 }}>
                                    <View style={{ flex: 1, justifyContent: 'center' }}>
                                        <Svg width="420" height="100" viewBox="0 0 420 100">
                                            {(() => {
                                                const width = 420;
                                                const height = 100;
                                                const maxSales = Math.max(...dailySales.map(d => d.total_sales)) || 100;

                                                // Grid Lines
                                                const gridLines = [0, 0.5, 1].map((p, i) => {
                                                    const y = height - (p * height);
                                                    return (
                                                        <Line key={`grid-${i}`} x1="0" y1={y} x2={width} y2={y} stroke="#e2e8f0" strokeWidth={1} />
                                                    );
                                                });

                                                const points = dailySales.map((d, i) => {
                                                    const x = (i / (dailySales.length - 1 || 1)) * width;
                                                    const y = height - (d.total_sales / maxSales) * height;
                                                    return `${x},${y}`;
                                                });

                                                const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.split(',').join(' ')}`).join(' ');

                                                return (
                                                    <React.Fragment>
                                                        {gridLines}
                                                        <Path d={`${pathD} L ${width} ${height} L 0 ${height} Z`} fill="#dbeafe" opacity={0.6} />
                                                        <Path d={pathD} stroke="#2563eb" strokeWidth={2} />
                                                    </React.Fragment>
                                                )
                                            })()}
                                        </Svg>
                                    </View>

                                    {/* X-Axis Labels */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', height: 18, paddingTop: 4 }}>
                                        <Text style={{ fontSize: 8, color: '#94a3b8' }}>
                                            {format(new Date(dailySales[0]?.sale_date || new Date()), "dd MMM", { locale: es })}
                                        </Text>
                                        <Text style={{ fontSize: 8, color: '#94a3b8' }}>
                                            {format(new Date(dailySales[Math.floor(dailySales.length / 2)]?.sale_date || new Date()), "dd MMM", { locale: es })}
                                        </Text>
                                        <Text style={{ fontSize: 8, color: '#94a3b8' }}>
                                            {format(new Date(dailySales[dailySales.length - 1]?.sale_date || new Date()), "dd MMM", { locale: es })}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        ) : (
                            <Text style={{ fontSize: 10, color: '#94a3b8', padding: 20 }}>No hay datos disponibles</Text>
                        )}
                    </View>
                </View>

                {/* Top Products with Ranking */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{strings.topProducts}</Text>
                    <View style={styles.chartContainer}>
                        {topProducts.slice(0, 5).map((product, index) => {
                            const percentOfTotal = totalProductRevenue > 0
                                ? ((product.total_revenue || 0) / totalProductRevenue) * 100
                                : 0;
                            const badgeColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#6b7280'];

                            return (
                                <View key={index} style={styles.topProductRow}>
                                    <View style={[styles.rankBadge, { backgroundColor: badgeColors[index] }]}>
                                        <Text style={styles.rankText}>#{index + 1}</Text>
                                    </View>
                                    <View style={styles.productInfo}>
                                        <Text style={styles.productName}>{product.product_name}</Text>
                                        <View style={styles.productStats}>
                                            <Text style={styles.productStat}>{product.total_quantity_sold || 0} unidades vendidas</Text>
                                        </View>
                                    </View>
                                    <View style={styles.productRevenue}>
                                        <Text style={styles.revenueValue}>{formatMoney(product.total_revenue || 0)}</Text>
                                        <Text style={styles.revenuePercent}>{percentOfTotal.toFixed(1)}% del total</Text>
                                    </View>
                                </View>
                            )
                        })}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>{companyName} • Reporte generado automáticamente</Text>
                    <Text style={styles.confidential}>CONFIDENCIAL</Text>
                    <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
                </View>
            </Page>

            {/* Page 2 - Detailed Table */}
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.companyName}>{companyName}</Text>
                        <Text style={[styles.title, { fontSize: 18 }]}>Detalle de Ventas Diarias</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={[styles.tableCell, styles.flex1, { fontWeight: 'bold' }]}>{strings.date}</Text>
                            <Text style={[styles.tableCell, styles.flex1, styles.textRight, { fontWeight: 'bold' }]}>{strings.sales}</Text>
                            <Text style={[styles.tableCell, styles.flex1, styles.textCenter, { fontWeight: 'bold' }]}>{strings.transactions}</Text>
                            <Text style={[styles.tableCell, styles.flex1, styles.textRight, { fontWeight: 'bold' }]}>Ticket Promedio</Text>
                        </View>
                        {dailySales.map((day, i) => {
                            const dayAvg = day.total_transactions > 0 ? day.total_sales / day.total_transactions : 0;
                            return (
                                <View key={i} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#f8fafc' } : {}]}>
                                    <Text style={[styles.tableCell, styles.flex1]}>
                                        {format(new Date(day.sale_date), "dd MMM yyyy", { locale: es })}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.flex1, styles.textRight]}>
                                        {formatMoney(day.total_sales)}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.flex1, styles.textCenter]}>
                                        {day.total_transactions}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.flex1, styles.textRight]}>
                                        {formatMoney(dayAvg)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>{companyName} • Reporte generado automáticamente</Text>
                    <Text style={styles.confidential}>CONFIDENCIAL</Text>
                    <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
};
