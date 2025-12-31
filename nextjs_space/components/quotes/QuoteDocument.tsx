import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Types
interface QuoteItem {
    product_id: number;
    product?: { name: string };
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    tax_rate: number;
    tax_amount?: number;
    subtotal?: number;
    notes?: string;
}

interface Customer {
    firstName?: string;
    lastName?: string;
    businessName?: string;
    email?: string;
    phone?: string;
    city?: string;
    address?: string;
}

interface QuoteDocumentProps {
    quote: {
        quote_number: string;
        quote_date: string;
        expiry_date?: string;
        status: string;
        customer?: Customer;
        items: QuoteItem[];
        subtotal: number;
        discount_amount: number;
        tax_amount: number;
        total_amount: number;
        notes?: string;
        terms_and_conditions?: string;
        delivery_time?: string;
    };
    companyInfo: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
        logoUrl?: string;
    };
    primaryColor?: string;
    strings: {
        quote: string;
        quoteNumber: string;
        date: string;
        expiryDate: string;
        customer: string;
        product: string;
        quantity: string;
        unitPrice: string;
        discount: string;
        tax: string;
        total: string;
        subtotal: string;
        notes: string;
        terms: string;
        deliveryTime: string;
        status: string;
        signature: string;
        acceptanceText: string;
        validUntil: string;
        thankYou: string;
    };
}

const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
        return format(new Date(dateStr), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
        return dateStr;
    }
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        draft: 'Borrador',
        pending: 'Pendiente',
        sent: 'Enviada',
        accepted: 'Aceptada',
        rejected: 'Rechazada',
        expired: 'Expirada',
        converted: 'Convertida'
    };
    return labels[status] || status;
};

const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        draft: '#94a3b8',
        pending: '#f59e0b',
        sent: '#3b82f6',
        accepted: '#10b981',
        rejected: '#ef4444',
        expired: '#6b7280',
        converted: '#8b5cf6'
    };
    return colors[status] || '#64748b';
};

// Styles
const createStyles = (primaryColor: string) => StyleSheet.create({
    page: {
        padding: 40,
        paddingBottom: 80,
        backgroundColor: '#ffffff',
        fontFamily: 'Helvetica',
        fontSize: 10,
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 3,
        borderBottomColor: primaryColor,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        alignItems: 'flex-end',
        width: 180,
    },
    companyName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    companyInfo: {
        fontSize: 8,
        color: '#64748b',
        marginBottom: 2,
    },
    quoteTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: primaryColor,
        marginBottom: 8,
    },
    quoteNumber: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 3,
    },
    quoteDate: {
        fontSize: 9,
        color: '#64748b',
        marginBottom: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginTop: 5,
    },
    statusText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    // Expiry Alert
    expiryBox: {
        backgroundColor: '#fef3c7',
        borderLeftWidth: 3,
        borderLeftColor: '#f59e0b',
        padding: 8,
        marginBottom: 15,
        borderRadius: 3,
    },
    expiryText: {
        fontSize: 9,
        color: '#92400e',
    },
    // Customer Section
    customerSection: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 20,
    },
    customerBox: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionLabel: {
        fontSize: 9,
        color: primaryColor,
        fontWeight: 'bold',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    customerName: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 3,
    },
    customerDetail: {
        fontSize: 9,
        color: '#64748b',
        marginBottom: 2,
    },
    // Table
    table: {
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: primaryColor,
        padding: 8,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    tableHeaderCell: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    tableRowAlt: {
        backgroundColor: '#f8fafc',
    },
    tableCell: {
        fontSize: 9,
        color: '#334155',
    },
    colProduct: { flex: 3 },
    colQty: { width: 50, textAlign: 'center' },
    colPrice: { width: 70, textAlign: 'right' },
    colDiscount: { width: 60, textAlign: 'right' },
    colTax: { width: 50, textAlign: 'center' },
    colTotal: { width: 80, textAlign: 'right' },
    // Totals
    totalsSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 20,
    },
    totalsBox: {
        width: 200,
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    totalLabel: {
        fontSize: 9,
        color: '#64748b',
    },
    totalValue: {
        fontSize: 9,
        color: '#1e293b',
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        marginTop: 4,
    },
    grandTotalLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    grandTotalValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: primaryColor,
    },
    // Notes
    notesSection: {
        marginBottom: 20,
    },
    notesBox: {
        backgroundColor: '#f8fafc',
        padding: 10,
        borderRadius: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#94a3b8',
    },
    notesTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#475569',
        marginBottom: 4,
    },
    notesText: {
        fontSize: 9,
        color: '#64748b',
        lineHeight: 1.4,
    },
    // Signature
    signatureSection: {
        flexDirection: 'row',
        marginTop: 30,
        gap: 40,
    },
    signatureBox: {
        flex: 1,
    },
    signatureLine: {
        borderTopWidth: 1,
        borderTopColor: '#cbd5e1',
        marginTop: 40,
        paddingTop: 5,
    },
    signatureLabel: {
        fontSize: 9,
        color: '#64748b',
        textAlign: 'center',
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 25,
        left: 40,
        right: 40,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 10,
    },
    footerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 8,
        color: '#94a3b8',
    },
    footerThankYou: {
        fontSize: 9,
        color: primaryColor,
        fontWeight: 'bold',
    },
    pageNumber: {
        fontSize: 8,
        color: '#64748b',
    },
});

export const QuoteDocument: React.FC<QuoteDocumentProps> = ({
    quote,
    companyInfo,
    primaryColor = '#3b82f6',
    strings
}) => {
    const styles = createStyles(primaryColor);
    const statusColor = getStatusColor(quote.status);

    // Check if expiry date is approaching (within 7 days)
    const isExpiringSoon = quote.expiry_date &&
        new Date(quote.expiry_date).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.companyName}>{companyInfo.name}</Text>
                        {companyInfo.address && (
                            <Text style={styles.companyInfo}>{companyInfo.address}</Text>
                        )}
                        {companyInfo.phone && (
                            <Text style={styles.companyInfo}>Tel: {companyInfo.phone}</Text>
                        )}
                        {companyInfo.email && (
                            <Text style={styles.companyInfo}>{companyInfo.email}</Text>
                        )}
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.quoteTitle}>{strings.quote}</Text>
                        <Text style={styles.quoteNumber}>{quote.quote_number}</Text>
                        <Text style={styles.quoteDate}>{strings.date}: {formatDate(quote.quote_date)}</Text>
                        {quote.expiry_date && (
                            <Text style={styles.quoteDate}>{strings.validUntil}: {formatDate(quote.expiry_date)}</Text>
                        )}
                        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                            <Text style={styles.statusText}>{getStatusLabel(quote.status)}</Text>
                        </View>
                    </View>
                </View>

                {/* Expiry Alert */}
                {isExpiringSoon && quote.status !== 'accepted' && quote.status !== 'converted' && (
                    <View style={styles.expiryBox}>
                        <Text style={styles.expiryText}>
                            ⚠️ Esta cotización vence el {formatDate(quote.expiry_date)}. Por favor responda pronto.
                        </Text>
                    </View>
                )}

                {/* Customer Section */}
                <View style={styles.customerSection}>
                    <View style={styles.customerBox}>
                        <Text style={styles.sectionLabel}>{strings.customer}</Text>
                        {quote.customer ? (
                            <>
                                <Text style={styles.customerName}>
                                    {quote.customer.businessName ||
                                        `${quote.customer.firstName || ''} ${quote.customer.lastName || ''}`.trim() ||
                                        'Cliente'}
                                </Text>
                                {quote.customer.businessName && quote.customer.firstName && (
                                    <Text style={styles.customerDetail}>
                                        Attn: {quote.customer.firstName} {quote.customer.lastName}
                                    </Text>
                                )}
                                {quote.customer.email && (
                                    <Text style={styles.customerDetail}>{quote.customer.email}</Text>
                                )}
                                {quote.customer.phone && (
                                    <Text style={styles.customerDetail}>{quote.customer.phone}</Text>
                                )}
                                {quote.customer.address && (
                                    <Text style={styles.customerDetail}>{quote.customer.address}</Text>
                                )}
                                {quote.customer.city && (
                                    <Text style={styles.customerDetail}>{quote.customer.city}</Text>
                                )}
                            </>
                        ) : (
                            <Text style={styles.customerDetail}>Cliente no especificado</Text>
                        )}
                    </View>

                    {quote.delivery_time && (
                        <View style={[styles.customerBox, { flex: 0.6 }]}>
                            <Text style={styles.sectionLabel}>{strings.deliveryTime}</Text>
                            <Text style={styles.customerName}>{quote.delivery_time}</Text>
                        </View>
                    )}
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    {/* Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colProduct]}>{strings.product}</Text>
                        <Text style={[styles.tableHeaderCell, styles.colQty]}>{strings.quantity}</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPrice]}>{strings.unitPrice}</Text>
                        <Text style={[styles.tableHeaderCell, styles.colDiscount]}>{strings.discount}</Text>
                        <Text style={[styles.tableHeaderCell, styles.colTax]}>{strings.tax}</Text>
                        <Text style={[styles.tableHeaderCell, styles.colTotal]}>{strings.total}</Text>
                    </View>

                    {/* Rows */}
                    {quote.items.map((item, index) => {
                        const itemTotal = (item.subtotal || 0) + (item.tax_amount || 0) - (item.discount_amount || 0);
                        return (
                            <View key={index} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}>
                                <Text style={[styles.tableCell, styles.colProduct]}>
                                    {item.product?.name || `Producto #${item.product_id}`}
                                </Text>
                                <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                                <Text style={[styles.tableCell, styles.colPrice]}>{formatMoney(item.unit_price)}</Text>
                                <Text style={[styles.tableCell, styles.colDiscount]}>{formatMoney(item.discount_amount || 0)}</Text>
                                <Text style={[styles.tableCell, styles.colTax]}>{item.tax_rate}%</Text>
                                <Text style={[styles.tableCell, styles.colTotal]}>{formatMoney(itemTotal)}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>{strings.subtotal}</Text>
                            <Text style={styles.totalValue}>{formatMoney(quote.subtotal)}</Text>
                        </View>
                        {quote.discount_amount > 0 && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>{strings.discount}</Text>
                                <Text style={styles.totalValue}>-{formatMoney(quote.discount_amount)}</Text>
                            </View>
                        )}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>{strings.tax}</Text>
                            <Text style={styles.totalValue}>{formatMoney(quote.tax_amount)}</Text>
                        </View>
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>{strings.total}</Text>
                            <Text style={styles.grandTotalValue}>{formatMoney(quote.total_amount)}</Text>
                        </View>
                    </View>
                </View>

                {/* Notes & Terms */}
                {(quote.notes || quote.terms_and_conditions) && (
                    <View style={styles.notesSection}>
                        {quote.notes && (
                            <View style={[styles.notesBox, { marginBottom: 10 }]}>
                                <Text style={styles.notesTitle}>{strings.notes}</Text>
                                <Text style={styles.notesText}>{quote.notes}</Text>
                            </View>
                        )}
                        {quote.terms_and_conditions && (
                            <View style={styles.notesBox}>
                                <Text style={styles.notesTitle}>{strings.terms}</Text>
                                <Text style={styles.notesText}>{quote.terms_and_conditions}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Signature Section */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 5 }}>{strings.acceptanceText}</Text>
                        <View style={styles.signatureLine}>
                            <Text style={styles.signatureLabel}>{strings.signature}</Text>
                        </View>
                    </View>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine}>
                            <Text style={styles.signatureLabel}>{strings.date}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <View style={styles.footerContent}>
                        <Text style={styles.footerText}>{companyInfo.name} • {companyInfo.phone || companyInfo.email}</Text>
                        <Text style={styles.footerThankYou}>{strings.thankYou}</Text>
                        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
                    </View>
                </View>
            </Page>
        </Document>
    );
};
