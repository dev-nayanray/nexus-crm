import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const c = await db.call.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, company: true } },
        lead: { select: { id: true, name: true, company: true } },
      },
    })
    if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(c)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const existing = await db.call.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.call.delete({ where: { id } })
    await logActivity({
      userId: user.id, action: 'DELETE', entity: 'CALL', entityId: id,
      summary: `Deleted call log`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
