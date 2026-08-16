import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleBulkAction } from '@/lib/bulk-action'
import { PRODUCT_STATUSES } from '@/lib/constants'

export async function POST(req: NextRequest) {
  return handleBulkAction(req, {
    entity: 'PRODUCT',
    model: db.product,
    statusField: 'status',
    validStatuses: Object.keys(PRODUCT_STATUSES),
    nameField: 'name',
  })
}
