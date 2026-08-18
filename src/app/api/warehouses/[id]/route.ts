import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  status: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const warehouse = await db.warehouse.findUnique({
      where: { id },
      include: {
        inventory: { include: { product: { select: { id: true, name: true, sku: true } } } },
        _count: { select: { inventory: true, stockMovements: true } },
      },
    })
    if (!warehouse) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(warehouse)
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

    if (parsed.isDefault) {
      await db.warehouse.updateMany({ where: { isDefault: true, NOT: { id } }, data: { isDefault: false } })
    }

    const updated = await db.warehouse.update({ where: { id }, data: parsed })
    await logActivity({
      userId: user.id, action: 'UPDATE', entity: 'WAREHOUSE', entityId: id, entityName: updated.name,
      summary: `Updated warehouse "${updated.name}"`,
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A warehouse with that code already exists' }, { status: 409 })
    }
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const existing = await db.warehouse.findUnique({
      where: { id },
      include: { inventory: { where: { quantity: { gt: 0 } } } },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (existing.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete the default warehouse. Set another warehouse as default first.' },
        { status: 409 }
      )
    }
    if (existing.inventory.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this warehouse still holds stock for ${existing.inventory.length} product(s). Transfer it out first.` },
        { status: 409 }
      )
    }

    await db.warehouse.delete({ where: { id } })
    await logActivity({
      userId: user.id, action: 'DELETE', entity: 'WAREHOUSE', entityId: id, entityName: existing.name,
      summary: `Deleted warehouse "${existing.name}"`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
