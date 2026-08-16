import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse, logActivity } from '@/lib/api'

const Schema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unit: z.string().optional().default('PCS'),
  price: z.number().min(0).default(0),
  cost: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(0),
  status: z.string().optional().default('ACTIVE'),
  imageUrl: z.string().optional().nullable(),
  initialStock: z.number().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    await requireUser()
    const { page, pageSize, skip, take, search, sort, order } = parsePagination(req)
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const category = url.searchParams.get('category')

    const where = {
      ...(status && status !== 'all' ? { status } : {}),
      ...(category && category !== 'all' ? { category } : {}),
      ...(search
        ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }, { category: { contains: search } }] }
        : {}),
    }

    const [data, total] = await Promise.all([
      db.product.findMany({
        where, skip, take,
        orderBy: { [sort]: order },
        include: { inventory: true },
      }),
      db.product.count({ where }),
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

    const { initialStock, ...productData } = parsed
    const product = await db.product.create({
      data: productData,
      include: { inventory: true },
    })

    if (initialStock && initialStock > 0) {
      await db.inventory.create({
        data: {
          productId: product.id,
          quantity: initialStock,
          reserved: 0,
          reorderLevel: 10,
          lastStockDate: new Date(),
        },
      })
    }

    await logActivity({
      userId: user.id, action: 'CREATE', entity: 'PRODUCT', entityId: product.id, entityName: product.name,
      summary: `Created product "${product.name}" (${product.sku}) — $${product.price}`,
    })
    return NextResponse.json(product, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
