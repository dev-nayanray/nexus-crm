import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { Order, Quotation } from './types'

// Register a clean font (uses default Helvetica which is built into PDF)
Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1e293b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, borderBottomWidth: 2, borderBottomColor: '#10b981', paddingBottom: 15 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 36, height: 36, backgroundColor: '#10b981', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  brandLogoText: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  brandName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  brandTagline: { fontSize: 8, color: '#64748b' },
  docTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', textAlign: 'right' },
  docNumber: { fontSize: 10, color: '#64748b', textAlign: 'right', marginTop: 4 },
  docDate: { fontSize: 9, color: '#94a3b8', textAlign: 'right', marginTop: 2 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 8, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  partyBox: { fontSize: 10, lineHeight: 1.5 },
  partyName: { fontWeight: 'bold', color: '#0f172a' },
  partyText: { color: '#475569' },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 20 },
  metaBox: { flex: 1, padding: 10, backgroundColor: '#f8fafc', borderRadius: 6 },
  metaLabel: { fontSize: 7, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 3 },
  metaValue: { fontSize: 10, fontWeight: 'bold', color: '#0f172a' },

  table: { marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 },
  tableHeaderCell: { fontSize: 8, fontWeight: 'bold', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  tableCell: { fontSize: 9, color: '#1e293b' },
  tableCellBold: { fontSize: 9, fontWeight: 'bold', color: '#0f172a' },

  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },

  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20 },
  totalsBox: { width: 240 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontSize: 9 },
  totalsLabel: { color: '#64748b' },
  totalsValue: { fontWeight: 'bold', color: '#0f172a' },
  totalsDivider: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginVertical: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, backgroundColor: '#10b981', borderRadius: 4, paddingHorizontal: 10, marginTop: 4 },
  totalLabel: { fontSize: 11, fontWeight: 'bold', color: '#ffffff' },
  totalValue: { fontSize: 13, fontWeight: 'bold', color: '#ffffff' },

  notes: { marginTop: 20, padding: 12, backgroundColor: '#f8fafc', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#10b981' },
  notesTitle: { fontSize: 8, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  notesText: { fontSize: 9, color: '#475569', lineHeight: 1.4 },

  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  footerText: { fontSize: 8, color: '#94a3b8' },
  footerPage: { fontSize: 8, color: '#94a3b8' },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
})

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null) return '—'
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', BDT: '৳', INR: '₹', AED: 'AED ' }
  const sym = symbols[currency] ?? ''
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Invoice PDF (for Orders) ───────────────────────────────────────────────

export function InvoiceDocument({ order, company }: { order: Order; company: { name: string; email: string; address: string } }) {
  const items = order.items ?? []
  const balanceDue = Math.max(0, order.total - order.paidAmount)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandLogo}>
              <Text style={styles.brandLogoText}>N</Text>
            </View>
            <View>
              <Text style={styles.brandName}>{company.name}</Text>
              <Text style={styles.brandTagline}>{company.email}</Text>
              <Text style={styles.brandTagline}>{company.address}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.docTitle}>INVOICE</Text>
            <Text style={styles.docNumber}>{order.number}</Text>
            <Text style={styles.docDate}>Issued: {formatDate(order.orderDate)}</Text>
            {order.dueDate && <Text style={styles.docDate}>Due: {formatDate(order.dueDate)}</Text>}
          </View>
        </View>

        {/* Bill To + Meta */}
        <View style={styles.metaRow}>
          <View style={[styles.metaBox, { flex: 2 }]}>
            <Text style={styles.metaLabel}>Bill To</Text>
            <Text style={[styles.metaValue, { marginBottom: 4 }]}>{order.customer?.name}</Text>
            <Text style={styles.partyText}>{order.customer?.company}</Text>
            <Text style={styles.partyText}>{order.customer?.email}</Text>
            <Text style={styles.partyText}>{order.customer?.phone}</Text>
            {order.billingAddress && <Text style={styles.partyText}>{order.billingAddress}</Text>}
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Invoice Date</Text>
            <Text style={styles.metaValue}>{formatDate(order.orderDate)}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Payment Status</Text>
            <Text style={[styles.metaValue, { color: order.paymentStatus === 'PAID' ? '#10b981' : order.paymentStatus === 'PARTIAL' ? '#f59e0b' : '#ef4444' }]}>
              {order.paymentStatus}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Order Status</Text>
            <Text style={styles.metaValue}>{order.status}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>
          {items.map((item, idx) => (
            <View key={item.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{item.qty}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{formatCurrency(item.unitPrice, order.currency)}</Text>
              <Text style={[styles.tableCellBold, styles.colTotal]}>{formatCurrency(item.total, order.currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(order.subtotal, order.currency)}</Text>
            </View>
            {order.discount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount ({order.discount}%)</Text>
                <Text style={styles.totalsValue}>−{formatCurrency(order.subtotal * order.discount / 100, order.currency)}</Text>
              </View>
            )}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax ({order.taxRate}%)</Text>
              <Text style={styles.totalsValue}>{formatCurrency(order.taxAmount, order.currency)}</Text>
            </View>
            {order.shipping > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Shipping</Text>
                <Text style={styles.totalsValue}>{formatCurrency(order.shipping, order.currency)}</Text>
              </View>
            )}
            <View style={styles.totalsDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(order.total, order.currency)}</Text>
            </View>
            {order.paidAmount > 0 && (
              <>
                <View style={[styles.totalsRow, { marginTop: 6 }]}>
                  <Text style={styles.totalsLabel}>Amount Paid</Text>
                  <Text style={[styles.totalsValue, { color: '#10b981' }]}>−{formatCurrency(order.paidAmount, order.currency)}</Text>
                </View>
                <View style={[styles.totalsRow, { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 }]}>
                  <Text style={[styles.totalsLabel, { fontWeight: 'bold' }]}>Balance Due</Text>
                  <Text style={[styles.totalsValue, { color: '#92400e', fontSize: 11 }]}>{formatCurrency(balanceDue, order.currency)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.name} · {company.email}</Text>
          <Text style={styles.footerText}>Thank you for your business!</Text>
          <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

// ─── Quotation PDF ──────────────────────────────────────────────────────────

export function QuotationDocument({ quotation, company }: { quotation: Quotation; company: { name: string; email: string; address: string } }) {
  const items = quotation.items ?? []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandLogo}>
              <Text style={styles.brandLogoText}>N</Text>
            </View>
            <View>
              <Text style={styles.brandName}>{company.name}</Text>
              <Text style={styles.brandTagline}>{company.email}</Text>
              <Text style={styles.brandTagline}>{company.address}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.docTitle}>QUOTATION</Text>
            <Text style={styles.docNumber}>{quotation.number}</Text>
            <Text style={styles.docDate}>Date: {formatDate(quotation.createdAt)}</Text>
            {quotation.validUntil && <Text style={styles.docDate}>Valid Until: {formatDate(quotation.validUntil)}</Text>}
          </View>
        </View>

        {/* Quote To + Meta */}
        <View style={styles.metaRow}>
          <View style={[styles.metaBox, { flex: 2 }]}>
            <Text style={styles.metaLabel}>Quote To</Text>
            <Text style={[styles.metaValue, { marginBottom: 4 }]}>{quotation.customer?.name}</Text>
            <Text style={styles.partyText}>{quotation.customer?.company}</Text>
            <Text style={styles.partyText}>{quotation.customer?.email}</Text>
            <Text style={styles.partyText}>{quotation.customer?.phone}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Subject</Text>
            <Text style={styles.metaValue}>{quotation.subject}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={[styles.metaValue, { color: quotation.status === 'ACCEPTED' ? '#10b981' : quotation.status === 'REJECTED' ? '#ef4444' : '#0f172a' }]}>
              {quotation.status}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Valid Until</Text>
            <Text style={styles.metaValue}>{formatDate(quotation.validUntil)}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>
          {items.map((item, idx) => (
            <View key={item.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{item.qty}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{formatCurrency(item.unitPrice, quotation.currency)}</Text>
              <Text style={[styles.tableCellBold, styles.colTotal]}>{formatCurrency(item.total, quotation.currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(quotation.subtotal, quotation.currency)}</Text>
            </View>
            {quotation.discount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount ({quotation.discount}%)</Text>
                <Text style={styles.totalsValue}>−{formatCurrency(quotation.subtotal * quotation.discount / 100, quotation.currency)}</Text>
              </View>
            )}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax</Text>
              <Text style={styles.totalsValue}>{formatCurrency(quotation.taxAmount, quotation.currency)}</Text>
            </View>
            <View style={styles.totalsDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(quotation.total, quotation.currency)}</Text>
            </View>
          </View>
        </View>

        {/* Terms + Notes */}
        {(quotation.terms || quotation.notes) && (
          <View style={styles.notes}>
            {quotation.terms && (
              <>
                <Text style={styles.notesTitle}>Terms & Conditions</Text>
                <Text style={styles.notesText}>{quotation.terms}</Text>
              </>
            )}
            {quotation.notes && (
              <>
                <Text style={[styles.notesTitle, { marginTop: 8 }]}>Notes</Text>
                <Text style={styles.notesText}>{quotation.notes}</Text>
              </>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.name} · {company.email}</Text>
          <Text style={styles.footerText}>This quotation is valid until {formatDate(quotation.validUntil)}</Text>
          <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
