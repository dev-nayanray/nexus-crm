import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  requireUser, apiError, parsePagination, paginatedResponse,
  scopeWhere, logActivity,
} from '@/lib/api'
import { generateNumber } from '@/lib/utils'

const CustomerSchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  type: z.enum(['INDIVIDUAL', 'BUSINESS']).optional().default('BUSINESS'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED']).optional().default('ACTIVE'),
  industry: z.string().optional().nullable(),
  annualRevenue: z.number().optional().nullable(),
  employees: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { page, pageSize, skip, take, search, sort, order } = parsePagination(req)
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const type = url.searchParams.get('type')

    const where = {
      ...scopeWhere(user),
      ...(status && status !== 'all' ? { status } : {}),
      ...(type && type !== 'all' ? { type } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { company: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    }

    const orderBy: Record<string, 'asc' | 'desc'> = { [sort]: order }

    const [data, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { orders: true, leads: true, quotations: true } },
        },
      }),
      db.customer.count({ where }),
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
    const parsed = CustomerSchema.parse(body)

    const count = await db.customer.count()
    const customer = await db.customer.create({
      data: { ...parsed, ownerId: user.id, annualRevenue: parsed.annualRevenue ?? null, employees: parsed.employees ?? null },
      include: { owner: { select: { id: true, name: true } } },
    })

    await logActivity({
      userId: user.id,
      action: 'CREATE',
      entity: 'CUSTOMER',
      entityId: customer.id,
      entityName: customer.name,
      summary: `Created customer "${customer.name}" (${customer.company})`,
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
