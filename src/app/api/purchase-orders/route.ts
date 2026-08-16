import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse, scopeWhere, logActivity } from '@/lib/api'
import { generateNumber } from '@/lib/utils'

const ItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1),
  qty: z.number().min(0).default(1),
  unitPrice: z.number().min(0).default(0),
})

const Schema = z.object({
  supplier: z.string().min(1),
  supplierEmail: z.string().optional().nullable(),
  supplierPhone: z.string().optional().nullable(),
  status: z.string().optional().default('DRAFT'),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(ItemSchema).min(1),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { page, pageSize, skip, take, search, sort, order } = parsePagination(req)
    const url = new URL(req.url)
    const status = url.searchParams.get('status')

    const where = {
      ...scopeWhere(user),
      ...(status && status !== 'all' ? { status } : {}),
      ...(search ? { OR: [{ number: { contains: search } }, { supplier: { contains: search } }] } : {}),
    }

    const [data, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where, skip, take,
        orderBy: { [sort]: order },
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      db.purchaseOrder.count({ where }),
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

    const count = await db.purchaseOrder.count()
    const number = generateNumber('PO', count)

    let subtotal = 0
    for (const it of parsed.items) {
      it.total = it.qty * it.unitPrice
      subtotal += it.total
    }

    const po = await db.purchaseOrder.create({
      data: {
        number,
        supplier: parsed.supplier,
        supplierEmail: parsed.supplierEmail ?? null,
        supplierPhone: parsed.supplierPhone ?? null,
        ownerId: user.id,
        status: parsed.status,
        expectedDate: parsed.expectedDate ? new Date(parsed.expectedDate) : null,
        notes: parsed.notes ?? null,
        subtotal,
        taxAmount: 0,
        total: subtotal,
        items: {
          create: parsed.items.map((it) => ({
            productId: it.productId ?? null,
            description: it.description,
            qty: it.qty,
            unitPrice: it.unitPrice,
            total: it.total,
          })),
        },
      },
      include: { items: { include: { product: { select: { name: true, sku: true } } } } },
    })

    await logActivity({
      userId: user.id, action: 'CREATE', entity: 'PURCHASE_ORDER', entityId: po.id, entityName: po.number,
      summary: `Created purchase order ${po.number} for ${po.supplier} — $${po.total}`,
    })
    return NextResponse.json(po, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
