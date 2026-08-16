import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse, logActivity } from '@/lib/api'

const Schema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0),
  reorderLevel: z.number().int().min(0).optional().default(10),
  location: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    await requireUser()
    const { page, pageSize, skip, take, search } = parsePagination(req)
    const url = new URL(req.url)
    const lowStock = url.searchParams.get('lowStock')

    const where = {
      ...(lowStock === 'true' ? { quantity: { lte: db.inventory.fields.reorderLevel } } : {}),
      ...(search
        ? { product: { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } }
        : {}),
    }

    const [data, total] = await Promise.all([
      db.inventory.findMany({
        where, skip, take,
        orderBy: { updatedAt: 'desc' },
        include: { product: { select: { id: true, name: true, sku: true, price: true, cost: true, category: true, status: true } } },
      }),
      db.inventory.count({ where }),
    ])
    return paginatedResponse(data, total, page, pageSize)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const parsed = Schema.parse(body)
    const inv = await db.inventory.upsert({
      where: { productId: parsed.productId },
      create: { ...parsed, lastStockDate: new Date() },
      update: {
        quantity: { increment: parsed.quantity },
        reorderLevel: parsed.reorderLevel,
        location: parsed.location ?? undefined,
        lastStockDate: new Date(),
      },
      include: { product: { select: { name: true, sku: true } } },
    })
    await logActivity({
      userId: user.id, action: 'UPDATE', entity: 'INVENTORY', entityId: inv.id, entityName: inv.product?.name,
      summary: `Added ${parsed.quantity} units to ${inv.product?.name} (${inv.product?.sku})`,
    })
    return NextResponse.json(inv, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
