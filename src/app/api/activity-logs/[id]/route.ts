import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const log = await db.activityLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(log)
  } catch (e) {
    return apiError(e)
  }
}
