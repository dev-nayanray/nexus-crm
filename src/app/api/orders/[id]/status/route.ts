import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

// Update order status only — also updates timestamps
const Schema = z.object({
  status: z.string().min(1),
})

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json()
    const parsed = Schema.parse(body)

    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const data: any = { status: parsed.status }
    if (parsed.status === 'SHIPPED' && !existing.shippedAt) data.shippedAt = new Date()
    if (parsed.status === 'DELIVERED' && !existing.deliveredAt) data.deliveredAt = new Date()
    if (parsed.status === 'CANCELLED' && !existing.cancelledAt) data.cancelledAt = new Date()

    const updated = await db.order.update({ where: { id }, data })

    await logActivity({
      userId: user.id, action: 'STATUS_CHANGE', entity: 'ORDER', entityId: id, entityName: existing.number,
      summary: `Order ${existing.number} moved to ${parsed.status}`,
      metadata: { from: existing.status, to: parsed.status },
    })

    return NextResponse.json(updated)
  } catch (e) {
    return apiError(e)
  }
}
