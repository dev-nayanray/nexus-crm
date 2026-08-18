import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse, logActivity } from '@/lib/api'

const Schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
  status: z.string().optional().default('ACTIVE'),
})

export async function GET(req: NextRequest) {
  try {
    await requireUser()
    const url = new URL(req.url)
    const flat = url.searchParams.get('flat')
    const status = url.searchParams.get('status')

    // flat=true -> simple array for dropdowns (no pagination), used by Inventory filters/transfer form
    if (flat === 'true') {
      const warehouses = await db.warehouse.findMany({
        where: { ...(status && status !== 'all' ? { status } : {}) },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        include: { _count: { select: { inventory: true } } },
      })
      return NextResponse.json({ data: warehouses })
    }

    const { page, pageSize, skip, take, search, sort, order } = parsePagination(req)
    const where = {
      ...(status && status !== 'all' ? { status } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] } : {}),
    }

    const [data, total] = await Promise.all([
      db.warehouse.findMany({
        where,
        skip,
        take,
        orderBy: sort === 'createdAt' ? [{ isDefault: 'desc' }, { name: 'asc' }] : { [sort]: order },
        include: { _count: { select: { inventory: true } } },
      }),
      db.warehouse.count({ where }),
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

    if (parsed.isDefault) {
      await db.warehouse.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
    }

    const warehouse = await db.warehouse.create({ data: parsed })

    await logActivity({
      userId: user.id, action: 'CREATE', entity: 'WAREHOUSE', entityId: warehouse.id, entityName: warehouse.name,
      summary: `Created warehouse "${warehouse.name}" (${warehouse.code})`,
    })
    return NextResponse.json(warehouse, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A warehouse with that code already exists' }, { status: 409 })
    }
    return apiError(e)
  }
}
