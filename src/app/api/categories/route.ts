import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, parsePagination, paginatedResponse, logActivity } from '@/lib/api'

const Schema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  status: z.string().optional().default('ACTIVE'),
  sortOrder: z.number().int().optional().default(0),
  parentId: z.string().optional().nullable(),
})

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base || 'category'
  let i = 1
  // Ensure slug uniqueness by suffixing -2, -3, ... on collision
  while (
    await db.category.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    })
  ) {
    i += 1
    slug = `${base}-${i}`
  }
  return slug
}

export async function GET(req: NextRequest) {
  try {
    await requireUser()
    const url = new URL(req.url)
    const flat = url.searchParams.get('flat')
    const status = url.searchParams.get('status')

    // flat=true -> simple array for dropdowns (no pagination), used by Products form/filter
    if (flat === 'true') {
      const categories = await db.category.findMany({
        where: { ...(status && status !== 'all' ? { status } : {}) },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { products: true, children: true } } },
      })
      return NextResponse.json({ data: categories })
    }

    const { page, pageSize, skip, take, search, sort, order } = parsePagination(req)
    const where = {
      ...(status && status !== 'all' ? { status } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } : {}),
    }

    const [data, total] = await Promise.all([
      db.category.findMany({
        where,
        skip,
        take,
        orderBy: sort === 'createdAt' ? [{ sortOrder: 'asc' }, { name: 'asc' }] : { [sort]: order },
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { products: true, children: true } },
        },
      }),
      db.category.count({ where }),
    ])
    return paginatedResponse(data, total, page, pageSize)
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const parsed = Schema.parse(body)

    if (parsed.parentId) {
      const parent = await db.category.findUnique({ where: { id: parsed.parentId } })
      if (!parent) return NextResponse.json({ error: 'Parent category not found' }, { status: 400 })
    }

    const slug = await uniqueSlug(slugify(parsed.slug || parsed.name))

    const category = await db.category.create({
      data: { ...parsed, slug },
    })

    await logActivity({
      userId: user.id, action: 'CREATE', entity: 'CATEGORY', entityId: category.id, entityName: category.name,
      summary: `Created category "${category.name}"`,
    })
    return NextResponse.json(category, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
