import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleCsvExport } from '@/lib/csv-export'

export async function GET(req: NextRequest) {
  return handleCsvExport(req, {
    entity: 'QUOTATION',
    filename: 'quotations',
    model: db.quotation,
    ownerField: 'ownerId',
    include: { customer: { select: { name: true, company: true } }, owner: { select: { name: true } }, _count: { select: { items: true } } },
    fields: [
      { key: 'number', label: 'Quote #' },
      { key: 'subject', label: 'Subject' },
      { key: 'customer.name', label: 'Customer' },
      { key: 'customer.company', label: 'Company' },
      { key: 'status', label: 'Status' },
      { key: 'subtotal', label: 'Subtotal' },
      { key: 'taxAmount', label: 'Tax' },
      { key: 'discount', label: 'Discount (%)' },
      { key: 'total', label: 'Total' },
      { key: 'currency', label: 'Currency' },
      { key: 'owner.name', label: 'Owner' },
      { key: '_count.items', label: 'Items' },
      { key: 'validUntil', label: 'Valid Until', accessor: (r) => r.validUntil ? new Date(r.validUntil).toISOString().split('T')[0] : '' },
      { key: 'sentAt', label: 'Sent', accessor: (r) => r.sentAt ? new Date(r.sentAt).toISOString().split('T')[0] : '' },
      { key: 'acceptedAt', label: 'Accepted', accessor: (r) => r.acceptedAt ? new Date(r.acceptedAt).toISOString().split('T')[0] : '' },
      { key: 'createdAt', label: 'Created', accessor: (r) => r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '' },
    ],
  })
}
