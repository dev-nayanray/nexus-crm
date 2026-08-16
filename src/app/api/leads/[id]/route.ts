import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  source: z.string().optional(),
  stage: z.string().optional(),
  status: z.string().optional(),
  value: z.number().optional(),
  currency: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  customerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  lostReason: z.string().optional().nullable(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, company: true, email: true } },
        followUps: { orderBy: { dueDate: 'desc' }, take: 10, include: { assignee: { select: { name: true } } } },
        quotations: { orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, number: true, status: true, total: true, currency: true, createdAt: true } },
        calls: { orderBy: { startedAt: 'desc' }, take: 5 },
        emailLogs: { orderBy: { sentAt: 'desc' }, take: 5 },
      },
    })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    return NextResponse.json(lead)
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

    const existing = await db.lead.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const stageChanged = parsed.stage && parsed.stage !== existing.stage

    const updated = await db.lead.update({
      where: { id },
      data: {
        ...parsed,
        expectedCloseDate: parsed.expectedCloseDate ? new Date(parsed.expectedCloseDate) : undefined,
        convertedAt: parsed.stage === 'WON' && !existing.convertedAt ? new Date() : undefined,
        lostReason: parsed.stage === 'LOST' ? parsed.lostReason ?? existing.lostReason : existing.lostReason,
      },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, company: true } },
      },
    })

    if (stageChanged) {
      await logActivity({
        userId: user.id,
        action: 'STATUS_CHANGE',
        entity: 'LEAD',
        entityId: id,
        entityName: updated.name,
        summary: `Moved lead "${updated.name}" to ${parsed.stage}`,
        metadata: { from: existing.stage, to: parsed.stage },
      })
    } else {
      await logActivity({
        userId: user.id,
        action: 'UPDATE',
        entity: 'LEAD',
        entityId: id,
        entityName: updated.name,
        summary: `Updated lead "${updated.name}"`,
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
    const existing = await db.lead.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    await db.lead.delete({ where: { id } })
    await logActivity({
      userId: user.id, action: 'DELETE', entity: 'LEAD', entityId: id, entityName: existing.name,
      summary: `Deleted lead "${existing.name}"`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
