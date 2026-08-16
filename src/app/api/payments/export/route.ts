import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleCsvExport } from '@/lib/csv-export'

export async function GET(req: NextRequest) {
  return handleCsvExport(req, {
    entity: 'PAYMENT',
    filename: 'payments',
    model: db.payment,
    ownerField: 'ownerId',
    include: { customer: { select: { name: true, company: true } }, order: { select: { number: true } }, owner: { select: { name: true } } },
    fields: [
      { key: 'number', label: 'Payment #' },
      { key: 'order.number', label: 'Order #' },
      { key: 'customer.name', label: 'Customer' },
      { key: 'customer.company', label: 'Company' },
      { key: 'amount', label: 'Amount' },
      { key: 'currency', label: 'Currency' },
      { key: 'method', label: 'Method' },
      { key: 'status', label: 'Status' },
      { key: 'reference', label: 'Reference' },
      { key: 'owner.name', label: 'Owner' },
      { key: 'paidAt', label: 'Paid At', accessor: (r) => r.paidAt ? new Date(r.paidAt).toISOString().split('T')[0] : '' },
      { key: 'createdAt', label: 'Created', accessor: (r) => r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '' },
    ],
  })
}
