import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params

    const customer = await db.customer.findUnique({ where: { id }, select: { id: true, name: true } })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const [leads, orders, quotations, payments, calls, emails, followUps, activities] = await Promise.all([
      db.lead.findMany({ where: { customerId: id }, select: { id: true, name: true, stage: true, value: true, currency: true, status: true, createdAt: true, convertedAt: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
      db.order.findMany({ where: { customerId: id }, select: { id: true, number: true, status: true, total: true, currency: true, paymentStatus: true, orderDate: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
      db.quotation.findMany({ where: { customerId: id }, select: { id: true, number: true, subject: true, status: true, total: true, currency: true, sentAt: true, acceptedAt: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
      db.payment.findMany({ where: { customerId: id }, select: { id: true, number: true, amount: true, currency: true, method: true, status: true, paidAt: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
      db.call.findMany({ where: { customerId: id }, select: { id: true, type: true, direction: true, status: true, duration: true, subject: true, startedAt: true }, orderBy: { startedAt: 'desc' }, take: 10 }),
      db.emailLog.findMany({ where: { customerId: id }, select: { id: true, subject: true, to: true, status: true, sentAt: true, openedAt: true }, orderBy: { sentAt: 'desc' }, take: 10 }),
      db.followUp.findMany({ where: { customerId: id }, select: { id: true, title: true, type: true, status: true, priority: true, dueDate: true, completedAt: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
      db.activityLog.findMany({ where: { entity: 'CUSTOMER', entityId: id }, select: { id: true, action: true, summary: true, userId: true, user: { select: { name: true } }, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ])

    type TimelineEvent = {
      id: string
      timestamp: string
      type: 'lead' | 'order' | 'quotation' | 'payment' | 'call' | 'email' | 'followup' | 'activity'
      icon: string
      title: string
      subtitle?: string
      meta?: string
      status?: string
      entityId: string
    }

    const events: TimelineEvent[] = []

    for (const l of leads) {
      events.push({
        id: `lead-${l.id}`, timestamp: (l.convertedAt ?? l.createdAt).toISOString(),
        type: 'lead', icon: 'Target',
        title: l.convertedAt ? `Lead converted: ${l.name}` : `New lead: ${l.name}`,
        subtitle: `Stage: ${l.stage}`,
        meta: l.value ? `${l.currency} ${l.value.toLocaleString()}` : undefined,
        status: l.status,
        entityId: l.id,
      })
    }

    for (const o of orders) {
      events.push({
        id: `order-${o.id}`, timestamp: (o.orderDate ?? o.createdAt).toISOString(),
        type: 'order', icon: 'ShoppingCart',
        title: `Order ${o.number}`,
        subtitle: `Status: ${o.status} · Payment: ${o.paymentStatus}`,
        meta: `${o.currency} ${o.total.toLocaleString()}`,
        status: o.status,
        entityId: o.id,
      })
    }

    for (const q of quotations) {
      events.push({
        id: `quote-${q.id}`, timestamp: (q.sentAt ?? q.acceptedAt ?? q.createdAt).toISOString(),
        type: 'quotation', icon: 'FileText',
        title: `Quotation ${q.number}`,
        subtitle: q.subject,
        meta: `${q.currency} ${q.total.toLocaleString()}`,
        status: q.status,
        entityId: q.id,
      })
    }

    for (const p of payments) {
      events.push({
        id: `payment-${p.id}`, timestamp: (p.paidAt ?? p.createdAt).toISOString(),
        type: 'payment', icon: 'CreditCard',
        title: `Payment ${p.number}`,
        subtitle: `${p.method.replace('_', ' ').toLowerCase()} · ${p.status}`,
        meta: `${p.currency} ${p.amount.toLocaleString()}`,
        status: p.status,
        entityId: p.id,
      })
    }

    for (const c of calls) {
      events.push({
        id: `call-${c.id}`, timestamp: c.startedAt.toISOString(),
        type: 'call', icon: c.type === 'CALL' ? 'Phone' : 'MessageSquare',
        title: c.subject ?? `${c.type.toLowerCase()} ${c.direction.toLowerCase()}`,
        subtitle: `${c.status.toLowerCase()} · ${c.duration}s`,
        status: c.status,
        entityId: c.id,
      })
    }

    for (const e of emails) {
      events.push({
        id: `email-${e.id}`, timestamp: e.sentAt.toISOString(),
        type: 'email', icon: 'Mail',
        title: e.subject,
        subtitle: `To: ${e.to} · ${e.status}`,
        status: e.status,
        entityId: e.id,
      })
    }

    for (const f of followUps) {
      events.push({
        id: `followup-${f.id}`, timestamp: (f.completedAt ?? f.dueDate).toISOString(),
        type: 'followup', icon: 'CalendarClock',
        title: f.title,
        subtitle: `${f.type} · ${f.status} · ${f.priority} priority`,
        status: f.status,
        entityId: f.id,
      })
    }

    for (const a of activities) {
      events.push({
        id: `activity-${a.id}`, timestamp: a.createdAt.toISOString(),
        type: 'activity', icon: 'History',
        title: a.summary,
        subtitle: a.user?.name ? `by ${a.user.name}` : undefined,
        status: a.action,
        entityId: a.id,
      })
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      customer: { id: customer.id, name: customer.name },
      events: events.slice(0, 50),
      total: events.length,
    })
  } catch (e) {
    return apiError(e)
  }
}
