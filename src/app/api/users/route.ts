import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, apiError, parsePagination, paginatedResponse, logActivity } from '@/lib/api'

const Schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'SALES_MANAGER', 'SALES_REP']),
  status: z.enum(['ACTIVE', 'DISABLED']).optional().default('ACTIVE'),
  phone: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN')
    const { page, pageSize, skip, take, search } = parsePagination(req)
    const url = new URL(req.url)
    const role = url.searchParams.get('role')
    const status = url.searchParams.get('status')

    const where = {
      ...(role && role !== 'all' ? { role } : {}),
      ...(status && status !== 'all' ? { status } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
    }

    const [data, total] = await Promise.all([
      db.user.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, role: true, status: true,
          phone: true, jobTitle: true, avatarUrl: true, lastLoginAt: true, createdAt: true,
          _count: { select: { customers: true, leads: true, orders: true } },
        },
      }),
      db.user.count({ where }),
    ])
    return paginatedResponse(data, total, page, pageSize)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN')
    const body = await req.json()
    const parsed = Schema.parse(body)

    if (!parsed.password) return NextResponse.json({ error: 'Password is required' }, { status: 400 })

    const existing = await db.user.findUnique({ where: { email: parsed.email.toLowerCase() } })
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 400 })

    const passwordHash = await bcrypt.hash(parsed.password, 10)
    const created = await db.user.create({
      data: {
        name: parsed.name,
        email: parsed.email.toLowerCase(),
        passwordHash,
        role: parsed.role,
        status: parsed.status,
        phone: parsed.phone ?? null,
        jobTitle: parsed.jobTitle ?? null,
        avatarUrl: parsed.avatarUrl ?? null,
      },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    })

    await logActivity({
      userId: user.id, action: 'CREATE', entity: 'USER', entityId: created.id, entityName: created.name,
      summary: `Created user ${created.email} with role ${created.role}`,
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
