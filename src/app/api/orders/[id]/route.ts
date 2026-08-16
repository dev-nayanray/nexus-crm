import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const order = await db.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, company: true, email: true, phone: true, address: true } },
        owner: { select: { id: true, name: true, email: true } },
        quotation: { select: { id: true, number: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    return NextResponse.json(order)
  } catch (e) {
    return apiError(e)
  }
}

const PatchSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json()
    const parsed = PatchSchema.parse(body)

    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const data: any = { ...parsed }
    if (parsed.status === 'SHIPPED' && !existing.shippedAt) data.shippedAt = new Date()
    if (parsed.status === 'DELIVERED' && !existing.deliveredAt) data.deliveredAt = new Date()
    if (parsed.status === 'CANCELLED' && !existing.cancelledAt) data.cancelledAt = new Date()

    const updated = await db.order.update({ where: { id }, data })

    if (parsed.status && parsed.status !== existing.status) {
      await logActivity({
        userId: user.id, action: 'STATUS_CHANGE', entity: 'ORDER', entityId: id, entityName: existing.number,
        summary: `Order ${existing.number} status: ${existing.status} → ${parsed.status}`,
        metadata: { from: existing.status, to: parsed.status },
      })
    }

    return NextResponse.json(updated)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.order.delete({ where: { id } })
    await logActivity({
      userId: user.id, action: 'DELETE', entity: 'ORDER', entityId: id, entityName: existing.number,
      summary: `Deleted order ${existing.number}`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
