import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleCsvExport } from '@/lib/csv-export'

export async function GET(req: NextRequest) {
  return handleCsvExport(req, {
    entity: 'ORDER',
    filename: 'orders',
    model: db.order,
    ownerField: 'ownerId',
    include: { customer: { select: { name: true, company: true, email: true } }, owner: { select: { name: true } }, _count: { select: { items: true, payments: true } } },
    fields: [
      { key: 'number', label: 'Order #' },
      { key: 'customer.name', label: 'Customer' },
      { key: 'customer.company', label: 'Company' },
      { key: 'customer.email', label: 'Customer Email' },
      { key: 'status', label: 'Status' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'fulfillmentStatus', label: 'Fulfillment' },
      { key: 'subtotal', label: 'Subtotal' },
      { key: 'taxAmount', label: 'Tax' },
      { key: 'discount', label: 'Discount (%)' },
      { key: 'shipping', label: 'Shipping' },
      { key: 'total', label: 'Total' },
      { key: 'paidAmount', label: 'Paid' },
      { key: 'currency', label: 'Currency' },
      { key: 'owner.name', label: 'Owner' },
      { key: '_count.items', label: 'Items' },
      { key: '_count.payments', label: 'Payments' },
      { key: 'orderDate', label: 'Order Date', accessor: (r) => r.orderDate ? new Date(r.orderDate).toISOString().split('T')[0] : '' },
      { key: 'shippedAt', label: 'Shipped', accessor: (r) => r.shippedAt ? new Date(r.shippedAt).toISOString().split('T')[0] : '' },
      { key: 'deliveredAt', label: 'Delivered', accessor: (r) => r.deliveredAt ? new Date(r.deliveredAt).toISOString().split('T')[0] : '' },
    ],
  })
}
