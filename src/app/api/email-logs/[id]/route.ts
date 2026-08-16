import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const e = await db.emailLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, company: true } },
        lead: { select: { id: true, name: true, company: true } },
      },
    })
    if (!e) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(e)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const existing = await db.emailLog.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.emailLog.delete({ where: { id } })
    await logActivity({
      userId: user.id, action: 'DELETE', entity: 'EMAIL', entityId: id,
      summary: `Deleted email log`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
