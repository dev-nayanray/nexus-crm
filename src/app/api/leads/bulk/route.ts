import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleBulkAction } from '@/lib/bulk-action'
import { LEAD_STAGES } from '@/lib/constants'

export async function POST(req: NextRequest) {
  return handleBulkAction(req, {
    entity: 'LEAD',
    model: db.lead,
    ownerField: 'ownerId',
    statusField: 'stage',
    validStatuses: Object.keys(LEAD_STAGES),
    nameField: 'name',
  })
}
