import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleBulkAction } from '@/lib/bulk-action'
import { FOLLOWUP_STATUSES } from '@/lib/constants'

export async function POST(req: NextRequest) {
  return handleBulkAction(req, {
    entity: 'FOLLOWUP',
    model: db.followUp,
    ownerField: 'assigneeId',
    statusField: 'status',
    validStatuses: Object.keys(FOLLOWUP_STATUSES),
    nameField: 'title',
  })
}
