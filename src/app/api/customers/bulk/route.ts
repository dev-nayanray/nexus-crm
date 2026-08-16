import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleBulkAction } from '@/lib/bulk-action'
import { CUSTOMER_STATUSES } from '@/lib/constants'

export async function POST(req: NextRequest) {
  return handleBulkAction(req, {
    entity: 'CUSTOMER',
    model: db.customer,
    ownerField: 'ownerId',
    statusField: 'status',
    validStatuses: Object.keys(CUSTOMER_STATUSES),
    nameField: 'name',
  })
}
