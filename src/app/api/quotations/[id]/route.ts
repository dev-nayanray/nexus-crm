import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const q = await db.quotation.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, company: true, email: true, phone: true, address: true } },
        owner: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, name: true, company: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    })
    if (!q) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    return NextResponse.json(q)
  } catch (e) {
    return apiError(e)
  }
}

const PatchSchema = z.object({
  subject: z.string().min(1).optional(),
  status: z.string().optional(),
  customerId: z.string().optional(),
  leadId: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  taxRate: z.number().optional(),
  discount: z.number().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json()
    const parsed = PatchSchema.parse(body)

    const existing = await db.quotation.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await db.quotation.update({
      where: { id },
      data: {
        ...parsed,
        validUntil: parsed.validUntil ? new Date(parsed.validUntil) : undefined,
        sentAt: parsed.status === 'SENT' && !existing.sentAt ? new Date() : undefined,
        acceptedAt: parsed.status === 'ACCEPTED' && !existing.acceptedAt ? new Date() : undefined,
      },
      include: {
        customer: { select: { id: true, name: true, company: true } },
        items: true,
      },
    })

    if (parsed.status && parsed.status !== existing.status) {
      await logActivity({
        userId: user.id, action: 'STATUS_CHANGE', entity: 'QUOTATION', entityId: id, entityName: updated.number,
        summary: `Quotation ${updated.number} marked as ${parsed.status}`,
        metadata: { from: existing.status, to: parsed.status },
      })
    }

    return NextResponse.json(updated)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const existing = await db.quotation.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.quotation.delete({ where: { id } })
    await logActivity({
      userId: user.id, action: 'DELETE', entity: 'QUOTATION', entityId: id, entityName: existing.number,
      summary: `Deleted quotation ${existing.number}`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
