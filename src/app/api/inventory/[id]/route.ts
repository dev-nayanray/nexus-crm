import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  location: z.string().optional().nullable(),
  adjustBy: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json()
    const parsed = PatchSchema.parse(body)

    const existing = await db.inventory.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const data: any = {}
    if (parsed.quantity != null) data.quantity = parsed.quantity
    if (parsed.reorderLevel != null) data.reorderLevel = parsed.reorderLevel
    if (parsed.location != null) data.location = parsed.location
    if (parsed.adjustBy != null) data.quantity = Math.max(0, existing.quantity + parsed.adjustBy)
    data.lastStockDate = new Date()

    const updated = await db.inventory.update({
      where: { id },
      data,
      include: { product: { select: { name: true, sku: true } } },
    })

    await logActivity({
      userId: user.id, action: 'UPDATE', entity: 'INVENTORY', entityId: id, entityName: updated.product?.name,
      summary: `Adjusted inventory for ${updated.product?.name}: now ${updated.quantity} units`,
    })

    return NextResponse.json(updated)
  } catch (e) {
    return apiError(e)
  }
}
