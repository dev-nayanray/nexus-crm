import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError, scopeWhere } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

const LIMIT = 5

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim()
    if (q.length < 2) {
      return NextResponse.json({ results: [], total: 0 })
    }

    const scope = scopeWhere(user)

    const [customers, leads, orders, quotations, products, users] = await Promise.all([
      db.customer.findMany({
        where: {
          ...scope,
          OR: [
            { name: { contains: q } },
            { company: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        },
        take: LIMIT,
        select: { id: true, name: true, company: true, email: true, status: true, industry: true },
      }),
      db.lead.findMany({
        where: {
          ...scope,
          OR: [
            { name: { contains: q } },
            { company: { contains: q } },
            { email: { contains: q } },
          ],
        },
        take: LIMIT,
        select: { id: true, name: true, company: true, stage: true, value: true, currency: true, status: true },
      }),
      db.order.findMany({
        where: {
          ...scope,
          OR: [
            { number: { contains: q } },
            { customer: { name: { contains: q } } },
            { customer: { company: { contains: q } } },
          ],
        },
        take: LIMIT,
        select: { id: true, number: true, status: true, total: true, currency: true, paymentStatus: true, customerId: true, customer: { select: { name: true, company: true } } },
      }),
      db.quotation.findMany({
        where: {
          ...scope,
          OR: [
            { number: { contains: q } },
            { subject: { contains: q } },
            { customer: { name: { contains: q } } },
            { customer: { company: { contains: q } } },
          ],
        },
        take: LIMIT,
        select: { id: true, number: true, subject: true, status: true, total: true, currency: true, customerId: true, customer: { select: { name: true, company: true } } },
      }),
      db.product.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { sku: { contains: q } },
            { category: { contains: q } },
          ],
        },
        take: LIMIT,
        select: { id: true, name: true, sku: true, price: true, category: true, status: true },
      }),
      user.role === 'ADMIN' || user.role === 'SALES_MANAGER'
        ? db.user.findMany({
            where: {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
                { jobTitle: { contains: q } },
              ],
            },
            take: LIMIT,
            select: { id: true, name: true, email: true, role: true, status: true, jobTitle: true },
          })
        : Promise.resolve([]),
    ])

    const results = [
      ...customers.map((c) => ({
        id: c.id, type: 'customer' as const,
        title: c.name, subtitle: c.company,
        meta: c.email, badge: c.status, badgeType: 'status' as const,
        icon: 'Users', module: 'customers' as const,
      })),
      ...leads.map((l) => ({
        id: l.id, type: 'lead' as const,
        title: l.name, subtitle: l.company,
        meta: formatCurrency(l.value, l.currency), badge: l.stage, badgeType: 'stage' as const,
        icon: 'Target', module: 'leads' as const,
      })),
      ...orders.map((o) => ({
        id: o.id, type: 'order' as const,
        title: o.number, subtitle: o.customer?.company ?? o.customer?.name ?? '',
        meta: formatCurrency(o.total, o.currency), badge: o.status, badgeType: 'status' as const,
        icon: 'ShoppingCart', module: 'orders' as const,
      })),
      ...quotations.map((q) => ({
        id: q.id, type: 'quotation' as const,
        title: q.number, subtitle: q.customer?.company ?? q.customer?.name ?? q.subject,
        meta: formatCurrency(q.total, q.currency), badge: q.status, badgeType: 'status' as const,
        icon: 'FileText', module: 'quotations' as const,
      })),
      ...products.map((p) => ({
        id: p.id, type: 'product' as const,
        title: p.name, subtitle: p.sku,
        meta: formatCurrency(p.price), badge: p.category, badgeType: 'category' as const,
        icon: 'Package', module: 'products' as const,
      })),
      ...users.map((u) => ({
        id: u.id, type: 'user' as const,
        title: u.name, subtitle: u.email,
        meta: u.jobTitle ?? '', badge: u.role, badgeType: 'role' as const,
        icon: 'ShieldCheck', module: 'users' as const,
      })),
    ]

    return NextResponse.json({
      results,
      total: results.length,
      query: q,
      counts: {
        customers: customers.length,
        leads: leads.length,
        orders: orders.length,
        quotations: quotations.length,
        products: products.length,
        users: users.length,
      },
    })
  } catch (e) {
    return apiError(e)
  }
}
