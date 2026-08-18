import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  status: z.string().optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().optional().nullable(),
})

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params
    const category = await db.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
        _count: { select: { products: true, children: true } },
      },
    })
    if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(category)
  } catch (e) {
    return apiError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json()
    const parsed = PatchSchema.parse(body)

    if (parsed.parentId) {
      if (parsed.parentId === id) {
        return NextResponse.json({ error: 'A category cannot be its own parent' }, { status: 400 })
      }
      const parent = await db.category.findUnique({ where: { id: parsed.parentId } })
      if (!parent) return NextResponse.json({ error: 'Parent category not found' }, { status: 400 })
      // Prevent cycles: walk up the chosen parent's ancestry and make sure `id` isn't in it
      let cursor: string | null = parsed.parentId
      const seen = new Set<string>()
      while (cursor) {
        if (cursor === id) {
          return NextResponse.json({ error: 'Cannot set a descendant as the parent (would create a cycle)' }, { status: 400 })
        }
        if (seen.has(cursor)) break
        seen.add(cursor)
        const node: { parentId: string | null } | null = await db.category.findUnique({ where: { id: cursor }, select: { parentId: true } })
        cursor = node?.parentId ?? null
      }
    }

    const data: Record<string, unknown> = { ...parsed }
    if (parsed.name && !parsed.slug) {
      data.slug = slugify(parsed.name)
    } else if (parsed.slug) {
      data.slug = slugify(parsed.slug)
    }
    if (data.slug) {
      const clash = await db.category.findFirst({ where: { slug: data.slug as string, id: { not: id } } })
      if (clash) data.slug = `${data.slug}-${Math.random().toString(36).slice(2, 6)}`
    }

    const updated = await db.category.update({ where: { id }, data })
    await logActivity({
      userId: user.id, action: 'UPDATE', entity: 'CATEGORY', entityId: id, entityName: updated.name,
      summary: `Updated category "${updated.name}"`,
    })
    return NextResponse.json(updated)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const existing = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${existing._count.products} product(s) still use this category. Reassign them first.` },
        { status: 409 }
      )
    }
    if (existing._count.children > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this category has ${existing._count.children} subcategor${existing._count.children === 1 ? 'y' : 'ies'}. Move or delete them first.` },
        { status: 409 }
      )
    }
    await db.category.delete({ where: { id } })
    await logActivity({
      userId: user.id, action: 'DELETE', entity: 'CATEGORY', entityId: id, entityName: existing.name,
      summary: `Deleted category "${existing.name}"`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return apiError(e)
  }
}
