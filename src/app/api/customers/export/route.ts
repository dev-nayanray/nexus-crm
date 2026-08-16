import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleCsvExport } from '@/lib/csv-export'

export async function GET(req: NextRequest) {
  return handleCsvExport(req, {
    entity: 'CUSTOMER',
    filename: 'customers',
    model: db.customer,
    ownerField: 'ownerId',
    include: { owner: { select: { name: true } }, _count: { select: { orders: true, leads: true } } },
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'company', label: 'Company' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'industry', label: 'Industry' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'country', label: 'Country' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'annualRevenue', label: 'Annual Revenue' },
      { key: 'employees', label: 'Employees' },
      { key: 'owner.name', label: 'Owner' },
      { key: '_count.orders', label: 'Orders' },
      { key: '_count.leads', label: 'Leads' },
      { key: 'createdAt', label: 'Created', accessor: (r) => r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '' },
    ],
  })
}
