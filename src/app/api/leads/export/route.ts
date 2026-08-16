import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleCsvExport } from '@/lib/csv-export'

export async function GET(req: NextRequest) {
  return handleCsvExport(req, {
    entity: 'LEAD',
    filename: 'leads',
    model: db.lead,
    ownerField: 'ownerId',
    include: { owner: { select: { name: true } }, customer: { select: { name: true, company: true } } },
    fields: [
      { key: 'name', label: 'Contact' },
      { key: 'company', label: 'Company' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'title', label: 'Title' },
      { key: 'source', label: 'Source' },
      { key: 'stage', label: 'Stage' },
      { key: 'status', label: 'Status' },
      { key: 'value', label: 'Value' },
      { key: 'currency', label: 'Currency' },
      { key: 'probability', label: 'Probability (%)' },
      { key: 'owner.name', label: 'Owner' },
      { key: 'customer.name', label: 'Converted Customer' },
      { key: 'expectedCloseDate', label: 'Expected Close', accessor: (r) => r.expectedCloseDate ? new Date(r.expectedCloseDate).toISOString().split('T')[0] : '' },
      { key: 'convertedAt', label: 'Converted At', accessor: (r) => r.convertedAt ? new Date(r.convertedAt).toISOString().split('T')[0] : '' },
      { key: 'lostReason', label: 'Lost Reason' },
      { key: 'createdAt', label: 'Created', accessor: (r) => r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '' },
    ],
  })
}
