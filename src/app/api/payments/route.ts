import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse, scopeWhere, logActivity } from '@/lib/api'

const Schema = z.object({
  orderId: z.string().min(1),
  amount: z.number().min(0.01),
  method: z.string().optional().default('BANK_TRANSFER'),
  status: z.string().optional().default('COMPLETED'),
  reference: z.string().optional().nullable(),
  paidAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { page, pageSize, skip, take, search, sort, order } = parsePagination(req)
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const method = url.searchParams.get('method')
    const orderId = url.searchParams.get('orderId')
    const customerId = url.searchParams.get('customerId')

    const where = {
      ...scopeWhere(user),
      ...(status && status !== 'all' ? { status } : {}),
      ...(method && method !== 'all' ? { method } : {}),
      ...(orderId ? { orderId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search } },
              { reference: { contains: search } },
              { customer: { name: { contains: search } } },
              { customer: { company: { contains: search } } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      db.payment.findMany({
        where, skip, take,
        orderBy: { [sort]: order },
        include: {
          customer: { select: { id: true, name: true, company: true } },
          order: { select: { id: true, number: true, total: true, currency: true } },
          owner: { select: { id: true, name: true } },
        },
      }),
      db.payment.count({ where }),
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

    const order = await db.order.findUnique({
      where: { id: parsed.orderId },
      include: { customer: { select: { id: true, name: true } } },
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const count = await db.payment.count()
    const number = `P-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`

    const payment = await db.payment.create({
      data: {
        number,
        orderId: order.id,
        customerId: order.customerId,
        ownerId: user.id,
        amount: parsed.amount,
        method: parsed.method,
        status: parsed.status,
        reference: parsed.reference ?? null,
        paidAt: parsed.paidAt ? new Date(parsed.paidAt) : parsed.status === 'COMPLETED' ? new Date() : null,
        notes: parsed.notes ?? null,
        currency: order.currency,
      },
      include: {
        customer: { select: { id: true, name: true, company: true } },
        order: { select: { id: true, number: true } },
      },
    })

    // Update order paidAmount and paymentStatus
    if (parsed.status === 'COMPLETED') {
      const newPaid = order.paidAmount + parsed.amount
      let paymentStatus = 'UNPAID'
      if (newPaid >= order.total) paymentStatus = newPaid > order.total ? 'OVERPAID' : 'PAID'
      else if (newPaid > 0) paymentStatus = 'PARTIAL'
      await db.order.update({
        where: { id: order.id },
        data: { paidAmount: newPaid, paymentStatus },
      })
    }

    await logActivity({
      userId: user.id, action: 'CREATE', entity: 'PAYMENT', entityId: payment.id, entityName: payment.number,
      summary: `Recorded payment ${payment.number} — $${payment.amount} for order ${order.number}`,
      metadata: { amount: payment.amount, orderId: order.id, method: payment.method },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
