import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleBulkAction } from '@/lib/bulk-action'
import { QUOTATION_STATUSES } from '@/lib/constants'

export async function POST(req: NextRequest) {
  return handleBulkAction(req, {
    entity: 'QUOTATION',
    model: db.quotation,
    ownerField: 'ownerId',
    statusField: 'status',
    validStatuses: Object.keys(QUOTATION_STATUSES),
    nameField: 'number',
  })
}
