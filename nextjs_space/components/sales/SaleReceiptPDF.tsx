'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { SaleWithItems } from '@/lib/types/sales'

// Register fonts (optional - uses default if not available)
// Font.register({
//   family: 'Inter',
//   src: '/fonts/Inter-Regular.ttf',
// })

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  businessInfo: {
    fontSize: 8,
    textAlign: 'center',
    color: '#666',
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  saleNumber: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 5,
  },
  dateTime: {
    fontSize: 9,
    textAlign: 'center',
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 3,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: '35%',
    color: '#666',
  },
  infoValue: {
    width: '65%',
    fontWeight: 'bold',
  },
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 4,
  },
  colProduct: {
    width: '40%',
  },
  colQty: {
    width: '15%',
    textAlign: 'center',
  },
  colPrice: {
    width: '20%',
    textAlign: 'right',
  },
  colTotal: {
    width: '25%',
    textAlign: 'right',
  },
  productName: {
    fontSize: 9,
  },
  productSku: {
    fontSize: 7,
    color: '#888',
    marginTop: 1,
  },
  totalsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  totalLabel: {
    color: '#666',
  },
  totalValue: {
    fontWeight: 'bold',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#000',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  paymentsSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#666',
    marginBottom: 3,
  },
  thankYou: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 10,
  },
  statusBadge: {
    textAlign: 'center',
    padding: 5,
    marginTop: 10,
    fontSize: 9,
    fontWeight: 'bold',
  },
  statusCompleted: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  statusCancelled: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  statusRefunded: {
    backgroundColor: '#e2e3e5',
    color: '#383d41',
  },
  notes: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#fff3cd',
    fontSize: 8,
  },
  notesTitle: {
    fontWeight: 'bold',
    marginBottom: 3,
  },
})

interface SaleReceiptPDFProps {
  sale: SaleWithItems
  businessName?: string
  businessAddress?: string
  businessPhone?: string
  businessEmail?: string
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

const PAYMENT_METHOD_NAMES: Record<number, string> = {
  1: 'Efectivo',
  2: 'Tarjeta de Credito',
  3: 'Tarjeta de Debito',
  4: 'Transferencia',
  5: 'Mercado Pago',
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'COMPLETADA',
  pending: 'PENDIENTE',
  cancelled: 'CANCELADA',
  refunded: 'REEMBOLSADA',
}

export const SaleReceiptPDF = ({
  sale,
  businessName = 'Mi Negocio',
  businessAddress,
  businessPhone,
  businessEmail,
}: SaleReceiptPDFProps) => {
  const getStatusStyle = () => {
    switch (sale.status) {
      case 'completed':
        return styles.statusCompleted
      case 'cancelled':
        return styles.statusCancelled
      case 'refunded':
        return styles.statusRefunded
      default:
        return {}
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.businessName}>{businessName}</Text>
          {businessAddress && (
            <Text style={styles.businessInfo}>{businessAddress}</Text>
          )}
          {(businessPhone || businessEmail) && (
            <Text style={styles.businessInfo}>
              {businessPhone && `Tel: ${businessPhone}`}
              {businessPhone && businessEmail && ' | '}
              {businessEmail && businessEmail}
            </Text>
          )}
          <Text style={styles.receiptTitle}>RECIBO DE VENTA</Text>
          <Text style={styles.saleNumber}>{sale.saleNumber}</Text>
          <Text style={styles.dateTime}>{formatDate(sale.createdAt)}</Text>
        </View>

        {/* Sale Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informacion de Venta</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cliente:</Text>
            <Text style={styles.infoValue}>
              {sale.customerName || 'Cliente General'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ubicacion:</Text>
            <Text style={styles.infoValue}>
              {sale.locationName || `Ubicacion ${sale.locationId}`}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Atendido por:</Text>
            <Text style={styles.infoValue}>
              {sale.soldByName || 'Usuario'}
            </Text>
          </View>
        </View>

        {/* Products Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.colProduct}>Producto</Text>
              <Text style={styles.colQty}>Cant.</Text>
              <Text style={styles.colPrice}>P. Unit.</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>

            {/* Table Rows */}
            {sale.items.map((item) => {
              // El unitPrice almacenado incluye el impuesto
              // Necesitamos mostrar el precio sin impuesto
              const TAX_RATE = 16
              const priceWithTax = item.unitPrice
              const priceWithoutTax = priceWithTax / (1 + TAX_RATE / 100)

              return (
                <View key={item.id} style={styles.tableRow}>
                  <View style={styles.colProduct}>
                    <Text style={styles.productName}>{item.productName}</Text>
                    <Text style={styles.productSku}>{item.productSku}</Text>
                  </View>
                  <Text style={styles.colQty}>{item.quantity}</Text>
                  <Text style={styles.colPrice}>
                    {formatCurrency(priceWithoutTax)}
                  </Text>
                  <Text style={styles.colTotal}>{formatCurrency(item.total)}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(sale.subtotal)}</Text>
          </View>

          {sale.discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Descuentos:</Text>
              <Text style={styles.totalValue}>
                -{formatCurrency(sale.discountAmount)}
              </Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA (16%):</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(sale.taxAmount)}
            </Text>
          </View>

          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>TOTAL:</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(sale.total)}
            </Text>
          </View>
        </View>

        {/* Payments */}
        <View style={styles.paymentsSection}>
          <Text style={styles.sectionTitle}>Metodos de Pago</Text>
          {sale.payments.map((payment) => (
            <View key={payment.id} style={styles.paymentRow}>
              <Text>
                {payment.paymentMethodName ||
                  PAYMENT_METHOD_NAMES[payment.paymentMethodId] ||
                  'Pago'}
              </Text>
              <Text style={styles.totalValue}>
                {formatCurrency(payment.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Status Badge */}
        {sale.status !== 'completed' && (
          <View style={[styles.statusBadge, getStatusStyle()]}>
            <Text>{STATUS_LABELS[sale.status]}</Text>
          </View>
        )}

        {/* Notes */}
        {sale.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notas:</Text>
            <Text>{sale.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Este documento es un comprobante de venta
          </Text>
          <Text style={styles.footerText}>
            Conserve este recibo para cualquier aclaracion
          </Text>
          <Text style={styles.thankYou}>Gracias por su compra!</Text>
        </View>
      </Page>
    </Document>
  )
}

export default SaleReceiptPDF
