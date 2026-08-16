import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError, scopeWhere } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

export async function GET() {
  try {
    const user = await requireUser()
    const scope = scopeWhere(user)

    const [
      customerCount,
      leadCount,
      openLeadsCount,
      orderCount,
      openOrders,
      pendingPayments,
      overdueFollowUps,
      lowStockProducts,
      recentLeads,
      recentOrders,
      recentActivity,
      leadStageAgg,
      revenueByMonth,
      topCustomers,
    ] = await Promise.all([
      db.customer.count({ where: scope }),
      db.lead.count({ where: scope }),
      db.lead.count({ where: { ...scope, status: 'OPEN' } }),
      db.order.count({ where: scope }),
      db.order.count({ where: { ...scope, status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'] } } }),
      db.payment.count({ where: { ...scope, status: 'PENDING' } }),
      db.followUp.count({ where: { ...scope, status: 'PENDING', dueDate: { lt: new Date() } } }),
      db.inventory.count({ where: { quantity: { lte: db.inventory.fields.reorderLevel } } }),
      db.lead.findMany({
        where: scope,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { name: true } } },
      }),
      db.order.findMany({
        where: scope,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, company: true } } },
      }),
      db.activityLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
      db.lead.groupBy({
        by: ['stage'],
        where: scope,
        _count: { _all: true },
        _sum: { value: true },
      }),
      getMonthlyRevenue(scope),
      getTopCustomers(scope),
    ])

    const totalRevenue = await db.payment.aggregate({
      where: { ...scope, status: 'COMPLETED' },
      _sum: { amount: true },
    })

    const pipelineValue = await db.lead.aggregate({
      where: { ...scope, status: 'OPEN' },
      _sum: { value: true },
    })

    const wonValue = await db.lead.aggregate({
      where: { ...scope, stage: 'WON' },
      _sum: { value: true },
    })

    return NextResponse.json({
      kpis: {
        customers: customerCount,
        leads: leadCount,
        openLeads: openLeadsCount,
        orders: orderCount,
        openOrders,
        pendingPayments,
        overdueFollowUps,
        lowStockProducts,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        pipelineValue: pipelineValue._sum.value ?? 0,
        wonValue: wonValue._sum.value ?? 0,
      },
      recentLeads: recentLeads.map((l) => ({
        id: l.id,
        name: l.name,
        company: l.company,
        stage: l.stage,
        value: l.value,
        currency: l.currency,
        owner: l.owner?.name,
        createdAt: l.createdAt,
      })),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: o.total,
        currency: o.currency,
        customer: o.customer,
        createdAt: o.createdAt,
      })),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        entity: a.entity,
        entityName: a.entityName,
        summary: a.summary,
        user: a.user?.name,
        createdAt: a.createdAt,
      })),
      leadStageAgg: leadStageAgg.map((s) => ({
        stage: s.stage,
        count: s._count._all,
        value: s._sum.value ?? 0,
      })),
      revenueByMonth,
      topCustomers: topCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company,
        totalRevenue: c.totalRevenue,
        orderCount: c.orderCount,
      })),
    })
  } catch (e) {
    return apiError(e)
  }
}

async function getMonthlyRevenue(scope: Record<string, string>) {
  // SQLite: group by year-month using strftime
  const payments = await db.payment.findMany({
    where: { ...scope, status: 'COMPLETED' },
    select: { amount: true, paidAt: true },
  })
  const byMonth: Record<string, number> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    byMonth[key] = 0
  }
  for (const p of payments) {
    const d = p.paidAt ?? p.paidAt
    if (!d) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in byMonth) byMonth[key] += p.amount
  }
  return Object.entries(byMonth).map(([month, amount]) => ({ month, amount }))
}

async function getTopCustomers(scope: Record<string, string>) {
  const orders = await db.order.findMany({
    where: { ...scope, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    select: { customerId: true, total: true, customer: { select: { id: true, name: true, company: true } } },
  })
  const byCustomer: Record<string, { name: string; company: string; totalRevenue: number; orderCount: number }> = {}
  for (const o of orders) {
    const c = o.customer
    if (!byCustomer[c.id]) byCustomer[c.id] = { name: c.name, company: c.company, totalRevenue: 0, orderCount: 0 }
    byCustomer[c.id].totalRevenue += o.total
    byCustomer[c.id].orderCount += 1
  }
  return Object.entries(byCustomer)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5)
}
