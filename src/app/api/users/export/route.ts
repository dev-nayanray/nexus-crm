import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleCsvExport } from '@/lib/csv-export'

export async function GET(req: NextRequest) {
  return handleCsvExport(req, {
    entity: 'USER',
    filename: 'users',
    model: db.user,
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status' },
      { key: 'jobTitle', label: 'Job Title' },
      { key: 'phone', label: 'Phone' },
      { key: 'lastLoginAt', label: 'Last Login', accessor: (r) => r.lastLoginAt ? new Date(r.lastLoginAt).toISOString() : '' },
      { key: 'createdAt', label: 'Created', accessor: (r) => r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '' },
    ],
  })
}
