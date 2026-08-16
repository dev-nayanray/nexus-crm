import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

// Convert quotation → order
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params

    const q = await db.quotation.findUnique({
      where: { id },
      include: { items: true, customer: { select: { id: true, name: true } } },
    })
    if (!q) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    if (q.status === 'CONVERTED') return NextResponse.json({ error: 'Already converted' }, { status: 400 })

    const orderCount = await db.order.count()
    const number = `O-${new Date().getFullYear()}-${String(orderCount + 1).padStart(5, '0')}`

    const order = await db.order.create({
      data: {
        number,
        customerId: q.customerId,
        quotationId: q.id,
        ownerId: user.id,
        status: 'CONFIRMED',
        paymentStatus: 'UNPAID',
        subtotal: q.subtotal,
        taxRate: q.taxRate,
        taxAmount: q.taxAmount,
        discount: q.discount,
        total: q.total,
        paidAmount: 0,
        currency: q.currency,
        orderDate: new Date(),
        items: {
          create: q.items.map((it) => ({
            productId: it.productId,
            description: it.description,
            qty: it.qty,
            unitPrice: it.unitPrice,
            discount: it.discount,
            taxRate: it.taxRate,
            total: it.total,
          })),
        },
      },
      include: { items: true, customer: { select: { name: true } } },
    })

    await db.quotation.update({
      where: { id },
      data: { status: 'CONVERTED', acceptedAt: new Date() },
    })

    await logActivity({
      userId: user.id, action: 'CONVERT', entity: 'QUOTATION', entityId: id, entityName: q.number,
      summary: `Converted quotation ${q.number} → order ${order.number}`,
      metadata: { orderId: order.id, orderNumber: order.number },
    })

    return NextResponse.json({ order, quotation: { id: q.id, status: 'CONVERTED' } })
  } catch (e) {
    return apiError(e)
  }
}
