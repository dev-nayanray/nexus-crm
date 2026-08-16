import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleBulkAction } from '@/lib/bulk-action'
import { ORDER_STATUSES } from '@/lib/constants'

export async function POST(req: NextRequest) {
  return handleBulkAction(req, {
    entity: 'ORDER',
    model: db.order,
    ownerField: 'ownerId',
    statusField: 'status',
    validStatuses: Object.keys(ORDER_STATUSES),
    nameField: 'number',
  })
}
