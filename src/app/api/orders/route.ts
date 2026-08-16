import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse, scopeWhere, logActivity } from '@/lib/api'

const ItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1),
  qty: z.number().min(0).default(1),
  unitPrice: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(0),
})

const Schema = z.object({
  customerId: z.string().min(1),
  quotationId: z.string().optional().nullable(),
  status: z.string().optional().default('PENDING'),
  taxRate: z.number().optional().default(0),
  discount: z.number().optional().default(0),
  shipping: z.number().optional().default(0),
  currency: z.string().optional().default('USD'),
  notes: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
  items: z.array(ItemSchema).min(1),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { page, pageSize, skip, take, search, sort, order } = parsePagination(req)
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const paymentStatus = url.searchParams.get('paymentStatus')
    const customerId = url.searchParams.get('customerId')

    const where = {
      ...scopeWhere(user),
      ...(status && status !== 'all' ? { status } : {}),
      ...(paymentStatus && paymentStatus !== 'all' ? { paymentStatus } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search } },
              { customer: { name: { contains: search } } },
              { customer: { company: { contains: search } } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      db.order.findMany({
        where, skip, take,
        orderBy: { [sort]: order },
        include: {
          customer: { select: { id: true, name: true, company: true } },
          owner: { select: { id: true, name: true } },
          _count: { select: { items: true, payments: true } },
        },
      }),
      db.order.count({ where }),
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

    const count = await db.order.count()
    const number = `O-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`

    let subtotal = 0
    let taxAmount = 0
    for (const it of parsed.items) {
      const ls = it.qty * it.unitPrice
      const ld = ls * (it.discount / 100)
      const lt = (ls - ld) * (it.taxRate / 100)
      subtotal += ls
      taxAmount += lt
      it.total = ls - ld + lt
    }
    const orderDiscount = subtotal * (parsed.discount / 100)
    const orderTax = (subtotal - orderDiscount) * (parsed.taxRate / 100)
    const total = subtotal - orderDiscount + orderTax + parsed.shipping

    const order = await db.order.create({
      data: {
        number,
        customerId: parsed.customerId,
        quotationId: parsed.quotationId ?? null,
        ownerId: user.id,
        status: parsed.status,
        paymentStatus: 'UNPAID',
        fulfillmentStatus: 'UNFULFILLED',
        subtotal,
        taxRate: parsed.taxRate,
        taxAmount: taxAmount + orderTax,
        discount: parsed.discount,
        shipping: parsed.shipping,
        total,
        paidAmount: 0,
        currency: parsed.currency,
        notes: parsed.notes ?? null,
        shippingAddress: parsed.shippingAddress ?? null,
        billingAddress: parsed.billingAddress ?? null,
        items: {
          create: parsed.items.map((it) => ({
            productId: it.productId ?? null,
            description: it.description,
            qty: it.qty,
            unitPrice: it.unitPrice,
            discount: it.discount,
            taxRate: it.taxRate,
            total: it.total,
          })),
        },
      },
      include: {
        customer: { select: { id: true, name: true, company: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    })

    await logActivity({
      userId: user.id, action: 'CREATE', entity: 'ORDER', entityId: order.id, entityName: order.number,
      summary: `Created order ${order.number} for ${order.customer?.name} — $${order.total}`,
      metadata: { total, currency: order.currency },
    })
    return NextResponse.json(order, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
