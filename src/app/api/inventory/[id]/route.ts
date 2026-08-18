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
  type: z.string().optional(), // ADJUST | DAMAGE | CORRECTION | RETURN | TRANSFER | SALE
  reason: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
})

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const inv = await db.inventory.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true, category: true, categoryRef: { select: { id: true, name: true } } } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
    })
    if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(inv)
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json()
    const parsed = PatchSchema.parse(body)

    const existing = await db.inventory.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const data: any = {}
    let quantityChange = 0
    let nextQuantity = existing.quantity

    if (parsed.adjustBy != null) {
      quantityChange = parsed.adjustBy
      nextQuantity = Math.max(0, existing.quantity + parsed.adjustBy)
      data.quantity = nextQuantity
    } else if (parsed.quantity != null) {
      quantityChange = parsed.quantity - existing.quantity
      nextQuantity = parsed.quantity
      data.quantity = nextQuantity
    }
    if (parsed.reorderLevel != null) data.reorderLevel = parsed.reorderLevel
    if (parsed.location != null) data.location = parsed.location
    if (Object.keys(data).length === 0 && !parsed.location) {
      // nothing to change on the quantity side, but still allow metadata-only updates
    }
    data.lastStockDate = new Date()

    const updated = await db.inventory.update({
      where: { id },
      data,
      include: { product: { select: { name: true, sku: true } } },
    })

    if (quantityChange !== 0) {
      await db.stockMovement.create({
        data: {
          inventoryId: id,
          productId: existing.productId,
          warehouseId: existing.warehouseId,
          type: parsed.type ?? (quantityChange > 0 ? 'ADJUST' : 'ADJUST'),
          quantityChange,
          quantityAfter: nextQuantity,
          reason: parsed.reason ?? 'Manual stock adjustment',
          reference: parsed.reference ?? undefined,
          userId: user.id,
        },
      })
    }

    await logActivity({
      userId: user.id, action: 'UPDATE', entity: 'INVENTORY', entityId: id, entityName: updated.product?.name,
      summary: `Adjusted inventory for ${updated.product?.name}: now ${updated.quantity} units`,
    })

    return NextResponse.json(updated)
  } catch (e) {
    return apiError(e)
  }
}
