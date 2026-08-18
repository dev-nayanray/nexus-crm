import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const url = new URL(req.url)
    const take = Math.min(100, Math.max(1, parseInt(url.searchParams.get('take') ?? '25', 10)))

    const movements = await db.stockMovement.findMany({
      where: { inventoryId: id },
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ data: movements })
  } catch (e) {
    return apiError(e)
  }
}
