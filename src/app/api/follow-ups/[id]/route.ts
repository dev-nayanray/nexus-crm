import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  dueDate: z.string().optional(),
  completedAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const fu = await db.followUp.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, company: true } },
        lead: { select: { id: true, name: true, company: true } },
      },
    })
    if (!fu) return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    return NextResponse.json(fu)
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

    const existing = await db.followUp.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await db.followUp.update({
      where: { id },
      data: {
        ...parsed,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
        completedAt: parsed.completedAt ? new Date(parsed.completedAt) : parsed.status === 'DONE' ? new Date() : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, company: true } },
        lead: { select: { id: true, name: true, company: true } },
      },
    })

    if (parsed.status && parsed.status !== existing.status) {
      await logActivity({
        userId: user.id, action: 'STATUS_CHANGE', entity: 'FOLLOWUP', entityId: id, entityName: updated.title,
        summary: `Marked follow-up "${updated.title}" as ${parsed.status}`,
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
    const existing = await db.followUp.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.followUp.delete({ where: { id } })
    await logActivity({
      userId: user.id, action: 'DELETE', entity: 'FOLLOWUP', entityId: id, entityName: existing.title,
      summary: `Deleted follow-up "${existing.title}"`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
