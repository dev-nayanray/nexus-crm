import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const p = await db.payment.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, company: true, email: true, phone: true } },
        order: { select: { id: true, number: true, total: true, currency: true, paidAmount: true } },
        owner: { select: { id: true, name: true } },
      },
    })
    if (!p) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    return NextResponse.json(p)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const existing = await db.payment.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Reverse the paidAmount on the order
    if (existing.status === 'COMPLETED') {
      const order = await db.order.findUnique({ where: { id: existing.orderId } })
      if (order) {
        const newPaid = Math.max(0, order.paidAmount - existing.amount)
        let paymentStatus = 'UNPAID'
        if (newPaid >= order.total) paymentStatus = 'PAID'
        else if (newPaid > 0) paymentStatus = 'PARTIAL'
        await db.order.update({
          where: { id: order.id },
          data: { paidAmount: newPaid, paymentStatus },
        })
      }
    }

    await db.payment.delete({ where: { id } })
    await logActivity({
      userId: user.id, action: 'DELETE', entity: 'PAYMENT', entityId: id, entityName: existing.number,
      summary: `Deleted payment ${existing.number}`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
