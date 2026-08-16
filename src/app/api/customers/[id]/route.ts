import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  type: z.enum(['INDIVIDUAL', 'BUSINESS']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED']).optional(),
  industry: z.string().optional().nullable(),
  annualRevenue: z.number().optional().nullable(),
  employees: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        leads: { select: { id: true, name: true, stage: true, value: true, status: true, createdAt: true }, take: 10, orderBy: { createdAt: 'desc' } },
        orders: { select: { id: true, number: true, status: true, paymentStatus: true, total: true, currency: true, createdAt: true }, take: 10, orderBy: { createdAt: 'desc' } },
        quotations: { select: { id: true, number: true, status: true, total: true, currency: true, createdAt: true }, take: 10, orderBy: { createdAt: 'desc' } },
        payments: { select: { id: true, number: true, amount: true, status: true, method: true, paidAt: true }, take: 10, orderBy: { createdAt: 'desc' } },
        calls: { select: { id: true, type: true, direction: true, status: true, duration: true, startedAt: true, subject: true }, take: 5, orderBy: { startedAt: 'desc' } },
        _count: { select: { leads: true, orders: true, quotations: true, payments: true, followUps: true, calls: true, emailLogs: true } },
      },
    })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    return NextResponse.json(customer)
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json()
    const parsed = UpdateSchema.parse(body)

    const existing = await db.customer.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const updated = await db.customer.update({
      where: { id },
      data: parsed,
      include: { owner: { select: { id: true, name: true } } },
    })

    await logActivity({
      userId: user.id,
      action: 'UPDATE',
      entity: 'CUSTOMER',
      entityId: id,
      entityName: updated.name,
      summary: `Updated customer "${updated.name}"`,
      metadata: { changes: Object.keys(parsed) },
    })

    return NextResponse.json(updated)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const existing = await db.customer.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    await db.customer.delete({ where: { id } })

    await logActivity({
      userId: user.id,
      action: 'DELETE',
      entity: 'CUSTOMER',
      entityId: id,
      entityName: existing.name,
      summary: `Deleted customer "${existing.name}"`,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
