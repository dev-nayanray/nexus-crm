import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireRole, apiError, scopeWhere, logActivity } from '@/lib/api'
import { z } from 'zod'

const Schema = z.object({
  action: z.enum(['delete', 'assign', 'status', 'stage']),
  ids: z.array(z.string()).min(1),
  value: z.string().optional(),
})

type BulkConfig = {
  entity: string
  model: any
  ownerField?: string  // for assign + scoping. If absent, only admins can delete.
  statusField?: string  // for status/stage
  validStatuses?: string[]
  nameField: string
}

export async function handleBulkAction(req: NextRequest, config: BulkConfig) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const parsed = Schema.parse(body)
    const { action, ids, value } = parsed

    // Scope: only allow acting on records the user can see.
    // Reps see only their own data; managers+admins see all.
    const scopeField = config.ownerField
    const scope = scopeField ? scopeWhere(user, scopeField) : {}

    // For entities without an owner (e.g. products), require admin for delete/assign
    if (!scopeField && action !== 'status' && action !== 'stage') {
      await requireRole('ADMIN')
    }

    if (action === 'delete') {
      const result = await config.model.deleteMany({
        where: { id: { in: ids }, ...scope },
      })
      await logActivity({
        userId: user.id,
        action: 'DELETE',
        entity: config.entity,
        entityId: 'bulk',
        summary: `Bulk deleted ${result.count} ${config.entity.toLowerCase()}(s)`,
        metadata: { ids, count: result.count },
      })
      return NextResponse.json({ success: true, count: result.count })
    }

    if (action === 'assign') {
      if (!scopeField) return NextResponse.json({ error: 'Cannot assign this entity' }, { status: 400 })
      if (!value) return NextResponse.json({ error: 'Owner ID required' }, { status: 400 })
      const targetUser = await db.user.findUnique({ where: { id: value } })
      if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      const result = await config.model.updateMany({
        where: { id: { in: ids }, ...scope },
        data: { [scopeField]: value },
      })
      await logActivity({
        userId: user.id,
        action: 'UPDATE',
        entity: config.entity,
        entityId: 'bulk',
        summary: `Bulk assigned ${result.count} ${config.entity.toLowerCase()}(s) to ${targetUser.name}`,
        metadata: { ids, assignedTo: targetUser.name },
      })
      return NextResponse.json({ success: true, count: result.count })
    }

    if (action === 'status' || action === 'stage') {
      if (!value) return NextResponse.json({ error: 'Status value required' }, { status: 400 })
      if (config.validStatuses && !config.validStatuses.includes(value)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      const field = config.statusField ?? action
      const result = await config.model.updateMany({
        where: { id: { in: ids }, ...scope },
        data: { [field]: value },
      })
      await logActivity({
        userId: user.id,
        action: 'STATUS_CHANGE',
        entity: config.entity,
        entityId: 'bulk',
        summary: `Bulk changed ${result.count} ${config.entity.toLowerCase()}(s) to ${value}`,
        metadata: { ids, to: value },
      })
      return NextResponse.json({ success: true, count: result.count })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return apiError(e)
  }
}
