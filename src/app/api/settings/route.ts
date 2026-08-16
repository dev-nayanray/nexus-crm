import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, apiError } from '@/lib/api'

export async function GET() {
  try {
    await requireRole('ADMIN')
    const settings = await db.setting.findMany()
    const obj: Record<string, string> = {}
    for (const s of settings) obj[s.key] = s.value
    return NextResponse.json(obj)
  } catch (e) {
    return apiError(e)
  }
}

const PatchSchema = z.record(z.string(), z.string())

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const body = await req.json()
    const parsed = PatchSchema.parse(body)

    for (const [key, value] of Object.entries(parsed)) {
      await db.setting.upsert({
        where: { key },
        create: { key, value, category: 'GENERAL', updatedBy: user.id },
        update: { value, updatedBy: user.id },
      })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
