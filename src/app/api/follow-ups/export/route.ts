import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleCsvExport } from '@/lib/csv-export'

export async function GET(req: NextRequest) {
  return handleCsvExport(req, {
    entity: 'FOLLOWUP',
    filename: 'follow-ups',
    model: db.followUp,
    ownerField: 'assigneeId',
    include: { assignee: { select: { name: true } }, customer: { select: { name: true, company: true } }, lead: { select: { name: true, company: true } } },
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'assignee.name', label: 'Assignee' },
      { key: 'customer.name', label: 'Customer' },
      { key: 'customer.company', label: 'Customer Company' },
      { key: 'lead.name', label: 'Lead' },
      { key: 'lead.company', label: 'Lead Company' },
      { key: 'notes', label: 'Notes' },
      { key: 'dueDate', label: 'Due Date', accessor: (r) => r.dueDate ? new Date(r.dueDate).toISOString().split('T')[0] : '' },
      { key: 'completedAt', label: 'Completed', accessor: (r) => r.completedAt ? new Date(r.completedAt).toISOString().split('T')[0] : '' },
      { key: 'createdAt', label: 'Created', accessor: (r) => r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '' },
    ],
  })
}
