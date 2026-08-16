import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    })
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(po)
  } catch (e) {
    return apiError(e)
  }
}

const PatchSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json()
    const parsed = PatchSchema.parse(body)

    const existing = await db.purchaseOrder.findUnique({ where: { id }, include: { items: true } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const data: any = { ...parsed }
    if (parsed.status === 'RECEIVED' && !existing.receivedAt) {
      data.receivedAt = new Date()
      // Add stock to inventory for each item
      for (const it of existing.items) {
        if (it.productId) {
          await db.inventory.upsert({
            where: { productId: it.productId },
            create: { productId: it.productId, quantity: it.qty, reorderLevel: 10, lastStockDate: new Date() },
            update: { quantity: { increment: it.qty }, lastStockDate: new Date() },
          })
        }
      }
    }

    const updated = await db.purchaseOrder.update({ where: { id }, data })
    await logActivity({
      userId: user.id, action: 'UPDATE', entity: 'PURCHASE_ORDER', entityId: id, entityName: existing.number,
      summary: `Purchase order ${existing.number} → ${parsed.status}`,
    })
    return NextResponse.json(updated)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const existing = await db.purchaseOrder.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.purchaseOrder.delete({ where: { id } })
    await logActivity({
      userId: user.id, action: 'DELETE', entity: 'PURCHASE_ORDER', entityId: id, entityName: existing.number,
      summary: `Deleted purchase order ${existing.number}`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
