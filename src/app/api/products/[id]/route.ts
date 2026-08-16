import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unit: z.string().optional(),
  price: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  status: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
})

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const p = await db.product.findUnique({
      where: { id },
      include: { inventory: true },
    })
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(p)
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
    const updated = await db.product.update({ where: { id }, data: parsed, include: { inventory: true } })
    await logActivity({
      userId: user.id, action: 'UPDATE', entity: 'PRODUCT', entityId: id, entityName: updated.name,
      summary: `Updated product "${updated.name}"`,
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
    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.product.delete({ where: { id } })
    await logActivity({
      userId: user.id, action: 'DELETE', entity: 'PRODUCT', entityId: id, entityName: existing.name,
      summary: `Deleted product "${existing.name}"`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
