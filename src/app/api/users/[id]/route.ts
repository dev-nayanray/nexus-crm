import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'SALES_MANAGER', 'SALES_REP']).optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  phone: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
})

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('ADMIN')
    const { id } = await params
    const u = await db.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, status: true,
        phone: true, jobTitle: true, avatarUrl: true, lastLoginAt: true, createdAt: true,
        _count: { select: { customers: true, leads: true, orders: true, payments: true, quotations: true } },
      },
    })
    if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(u)
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const currentUser = await requireRole('ADMIN')
    const { id } = await params
    const body = await req.json()
    const parsed = PatchSchema.parse(body)

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const data: any = { ...parsed }
    if (parsed.password) {
      data.passwordHash = await bcrypt.hash(parsed.password, 10)
      delete data.password
    }
    if (parsed.email) data.email = parsed.email.toLowerCase()

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, status: true, phone: true, jobTitle: true, avatarUrl: true },
    })

    await logActivity({
      userId: currentUser.id, action: 'UPDATE', entity: 'USER', entityId: id, entityName: updated.name,
      summary: `Updated user ${updated.email}`,
    })
    return NextResponse.json(updated)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const currentUser = await requireRole('ADMIN')
    const { id } = await params
    if (id === currentUser.id) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.user.delete({ where: { id } })
    await logActivity({
      userId: currentUser.id, action: 'DELETE', entity: 'USER', entityId: id, entityName: existing.name,
      summary: `Deleted user ${existing.email}`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
