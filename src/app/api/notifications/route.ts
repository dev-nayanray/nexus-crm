import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError, scopeWhere } from '@/lib/api'
import { formatCurrency, formatRelative } from '@/lib/utils'

export async function GET() {
  try {
    const user = await requireUser()
    const scope = scopeWhere(user)

    const [overdueFollowUps, pendingPayments, lowStock, recentLeads, unpaidOrders] = await Promise.all([
      db.followUp.findMany({
        where: { ...scopeWhere(user, 'assigneeId'), status: 'PENDING', dueDate: { lt: new Date() } },
        take: 5,
        orderBy: { dueDate: 'asc' },
        include: { customer: { select: { name: true, company: true } }, lead: { select: { name: true, company: true } } },
      }),
      db.payment.findMany({
        where: { ...scope, status: 'PENDING' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } }, order: { select: { number: true } } },
      }),
      db.inventory.findMany({
        where: { quantity: { lte: db.inventory.fields.reorderLevel } },
        take: 5,
        include: { product: { select: { name: true, sku: true } } },
      }),
      db.lead.findMany({
        where: { ...scope, status: 'OPEN', createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, company: true, value: true, currency: true, createdAt: true },
      }),
      db.order.findMany({
        where: { ...scope, paymentStatus: { in: ['UNPAID', 'PARTIAL'] }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } },
      }),
    ])

    type Notification = {
      id: string
      type: 'overdue_followup' | 'pending_payment' | 'low_stock' | 'new_lead' | 'unpaid_order'
      severity: 'high' | 'medium' | 'low'
      title: string
      description: string
      meta?: string
      module: string
      entityId?: string
      timestamp: string
    }

    const notifications: Notification[] = []

    for (const f of overdueFollowUps) {
      notifications.push({
        id: `overdue-${f.id}`,
        type: 'overdue_followup',
        severity: 'high',
        title: `Overdue: ${f.title}`,
        description: f.customer?.company ?? f.lead?.company ?? 'General',
        meta: `Due ${formatRelative(f.dueDate)}`,
        module: 'follow-ups',
        entityId: f.id,
        timestamp: f.dueDate.toISOString(),
      })
    }

    for (const p of pendingPayments) {
      notifications.push({
        id: `pending-pay-${p.id}`,
        type: 'pending_payment',
        severity: 'medium',
        title: `Payment pending: ${formatCurrency(p.amount, p.currency)}`,
        description: `${p.customer?.name ?? 'Unknown'} · Order ${p.order?.number ?? '—'}`,
        meta: `Created ${formatRelative(p.createdAt)}`,
        module: 'payments',
        entityId: p.id,
        timestamp: p.createdAt.toISOString(),
      })
    }

    for (const inv of lowStock) {
      notifications.push({
        id: `low-stock-${inv.id}`,
        type: 'low_stock',
        severity: 'medium',
        title: `Low stock: ${inv.product?.name}`,
        description: `SKU: ${inv.product?.sku}`,
        meta: `${inv.quantity} left (reorder at ${inv.reorderLevel})`,
        module: 'inventory',
        entityId: inv.id,
        timestamp: inv.updatedAt.toISOString(),
      })
    }

    for (const o of unpaidOrders) {
      const balance = o.total - o.paidAmount
      if (balance > 0) {
        notifications.push({
          id: `unpaid-order-${o.id}`,
          type: 'unpaid_order',
          severity: 'medium',
          title: `Unpaid balance: ${formatCurrency(balance, o.currency)}`,
          description: `Order ${o.number} · ${o.customer?.name ?? '—'}`,
          meta: `Total ${formatCurrency(o.total, o.currency)}, paid ${formatCurrency(o.paidAmount, o.currency)}`,
          module: 'orders',
          entityId: o.id,
          timestamp: o.createdAt.toISOString(),
        })
      }
    }

    for (const l of recentLeads) {
      notifications.push({
        id: `new-lead-${l.id}`,
        type: 'new_lead',
        severity: 'low',
        title: `New lead: ${l.name}`,
        description: l.company,
        meta: l.value > 0 ? `${formatCurrency(l.value, l.currency)} · ${formatRelative(l.createdAt)}` : formatRelative(l.createdAt),
        module: 'leads',
        entityId: l.id,
        timestamp: l.createdAt.toISOString(),
      })
    }

    // Sort by severity (high first), then by timestamp
    const severityOrder = { high: 0, medium: 1, low: 2 }
    notifications.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return NextResponse.json({
      notifications: notifications.slice(0, 20),
      total: notifications.length,
      counts: {
        high: notifications.filter((n) => n.severity === 'high').length,
        medium: notifications.filter((n) => n.severity === 'medium').length,
        low: notifications.filter((n) => n.severity === 'low').length,
      },
    })
  } catch (e) {
    return apiError(e)
  }
}
