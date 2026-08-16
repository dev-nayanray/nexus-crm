import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError, scopeWhere } from '@/lib/api'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const scope = scopeWhere(user)
    const url = new URL(req.url)
    const range = url.searchParams.get('range') ?? '30' // days

    const days = parseInt(range, 10)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [leadsByStage, leadsBySource, ordersByStatus, paymentsByMethod, revenueByMonth, topProducts, conversionFunnel] =
      await Promise.all([
        db.lead.groupBy({ by: ['stage'], where: scope, _count: { _all: true }, _sum: { value: true } }),
        db.lead.groupBy({ by: ['source'], where: scope, _count: { _all: true }, _sum: { value: true } }),
        db.order.groupBy({ by: ['status'], where: scope, _count: { _all: true }, _sum: { total: true } }),
        db.payment.groupBy({ by: ['method'], where: { ...scope, status: 'COMPLETED' }, _count: { _all: true }, _sum: { amount: true } }),
        getMonthlyRevenue(scope, 12),
        getTopProducts(scope),
        getConversionFunnel(scope),
      ])

    const totals = {
      leads: await db.lead.count({ where: { ...scope, createdAt: { gte: since } } }),
      orders: await db.order.count({ where: { ...scope, createdAt: { gte: since } } }),
      revenue: (await db.payment.aggregate({
        where: { ...scope, status: 'COMPLETED', paidAt: { gte: since } },
        _sum: { amount: true },
      }))._sum.amount ?? 0,
      customers: await db.customer.count({ where: { ...scope, createdAt: { gte: since } } }),
    }

    return NextResponse.json({
      totals,
      leadsByStage: leadsByStage.map((s) => ({ stage: s.stage, count: s._count._all, value: s._sum.value ?? 0 })),
      leadsBySource: leadsBySource.map((s) => ({ source: s.source, count: s._count._all, value: s._sum.value ?? 0 })),
      ordersByStatus: ordersByStatus.map((s) => ({ status: s.status, count: s._count._all, total: s._sum.total ?? 0 })),
      paymentsByMethod: paymentsByMethod.map((s) => ({ method: s.method, count: s._count._all, amount: s._sum.amount ?? 0 })),
      revenueByMonth,
      topProducts,
      conversionFunnel,
    })
  } catch (e) {
    return apiError(e)
  }
}

async function getMonthlyRevenue(scope: Record<string, string>, months: number) {
  const payments = await db.payment.findMany({
    where: { ...scope, status: 'COMPLETED' },
    select: { amount: true, paidAt: true },
  })
  const byMonth: Record<string, number> = {}
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    byMonth[key] = 0
  }
  for (const p of payments) {
    if (!p.paidAt) continue
    const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`
    if (key in byMonth) byMonth[key] += p.amount
  }
  return Object.entries(byMonth).map(([month, amount]) => ({ month, amount }))
}

async function getTopProducts(scope: Record<string, string>) {
  const items = await db.orderItem.findMany({
    where: { order: { ...scope, status: { notIn: ['CANCELLED', 'REFUNDED'] } } },
    select: { productId: true, qty: true, total: true, product: { select: { name: true, sku: true } } },
  })
  const byProduct: Record<string, { name: string; sku: string; qty: number; revenue: number }> = {}
  for (const it of items) {
    if (!it.productId || !it.product) continue
    if (!byProduct[it.productId]) byProduct[it.productId] = { name: it.product.name, sku: it.product.sku, qty: 0, revenue: 0 }
    byProduct[it.productId].qty += it.qty
    byProduct[it.productId].revenue += it.total
  }
  return Object.entries(byProduct)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
}

async function getConversionFunnel(scope: Record<string, string>) {
  const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON']
  const result = []
  for (const stage of stages) {
    const count = await db.lead.count({ where: { ...scope, stage } })
    result.push({ stage, count })
  }
  return result
}
