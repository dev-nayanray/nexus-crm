import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse, scopeWhere, logActivity } from '@/lib/api'
import { generateNumber } from '@/lib/utils'

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
  leadId: z.string().optional().nullable(),
  subject: z.string().min(1),
  status: z.string().optional().default('DRAFT'),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  taxRate: z.number().optional().default(0),
  discount: z.number().optional().default(0),
  currency: z.string().optional().default('USD'),
  items: z.array(ItemSchema).min(1),
})

function calcTotals(items: any[], taxRate = 0, discount = 0) {
  let subtotal = 0
  let taxAmount = 0
  for (const it of items) {
    const lineSubtotal = it.qty * it.unitPrice
    const lineDiscount = lineSubtotal * (it.discount / 100)
    const lineTaxable = lineSubtotal - lineDiscount
    const lineTax = lineTaxable * (it.taxRate / 100)
    subtotal += lineSubtotal
    taxAmount += lineTax
    it.total = lineTaxable + lineTax
  }
  const orderDiscount = (subtotal - 0) * (discount / 100)
  const orderTax = (subtotal - orderDiscount) * (taxRate / 100)
  const total = subtotal - orderDiscount + orderTax
  return { subtotal, taxAmount: taxAmount + orderTax, total }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { page, pageSize, skip, take, search, sort, order } = parsePagination(req)
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const customerId = url.searchParams.get('customerId')

    const where = {
      ...scopeWhere(user),
      ...(status && status !== 'all' ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search } },
              { subject: { contains: search } },
              { customer: { name: { contains: search } } },
              { customer: { company: { contains: search } } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      db.quotation.findMany({
        where,
        skip,
        take,
        orderBy: { [sort]: order },
        include: {
          customer: { select: { id: true, name: true, company: true } },
          owner: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      db.quotation.count({ where }),
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

    const count = await db.quotation.count()
    const number = generateNumber('Q', count)
    const totals = calcTotals(parsed.items, parsed.taxRate, parsed.discount)

    const quotation = await db.quotation.create({
      data: {
        number,
        customerId: parsed.customerId,
        leadId: parsed.leadId ?? null,
        ownerId: user.id,
        subject: parsed.subject,
        status: parsed.status,
        validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
        notes: parsed.notes ?? null,
        terms: parsed.terms ?? null,
        taxRate: parsed.taxRate,
        discount: parsed.discount,
        currency: parsed.currency,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
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
        owner: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    })

    await logActivity({
      userId: user.id, action: 'CREATE', entity: 'QUOTATION', entityId: quotation.id, entityName: quotation.number,
      summary: `Created quotation ${quotation.number} for ${quotation.customer?.name} — $${quotation.total}`,
      metadata: { total: quotation.total, currency: quotation.currency },
    })

    return NextResponse.json(quotation, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
