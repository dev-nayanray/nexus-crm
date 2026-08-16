import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireUser, apiError, scopeWhere } from '@/lib/api'

type FieldDef = {
  key: string
  label: string
  // accessor can be a dotted path like 'customer.name' or a function
  accessor?: (row: any) => string | number | null | undefined
}

type ExportConfig = {
  entity: string
  filename: string
  model: any
  fields: FieldDef[]
  ownerField?: string  // for data scoping
  extraWhere?: Record<string, unknown>
  orderBy?: Record<string, 'asc' | 'desc'>
  include?: any
}

function escapeCsv(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  // Quote if contains comma, quote, newline
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function getNestedValue(obj: any, path: string): unknown {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

export async function handleCsvExport(req: NextRequest, config: ExportConfig) {
  try {
    const user = await requireUser()
    const url = new URL(req.url)
    const search = url.searchParams.get('search') ?? ''
    const status = url.searchParams.get('status')
    const stage = url.searchParams.get('stage')
    const type = url.searchParams.get('type')

    const scopeField = config.ownerField
    const scope = scopeField ? scopeWhere(user, scopeField) : {}

    // Build where clause based on common filters
    const where: any = { ...scope, ...(config.extraWhere ?? {}) }

    if (search) {
      where.OR = config.fields
        .filter((f) => !f.accessor)
        .slice(0, 4)
        .map((f) => ({ [f.key]: { contains: search } }))
    }
    if (status && status !== 'all') where.status = status
    if (stage && stage !== 'all') where.stage = stage
    if (type && type !== 'all') where.type = type

    const rows = await config.model.findMany({
      where,
      orderBy: config.orderBy ?? { createdAt: 'desc' },
      include: config.include,
      take: 1000, // cap exports at 1000 rows
    })

    // Build CSV
    const header = config.fields.map((f) => escapeCsv(f.label)).join(',')
    const body = rows
      .map((row) =>
        config.fields
          .map((f) => {
            const v = f.accessor ? f.accessor(row) : getNestedValue(row, f.key)
            return escapeCsv(v)
          })
          .join(',')
      )
      .join('\n')

    const csv = `${header}\n${body}`
    const filename = `${config.filename}-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (e) {
    return apiError(e)
  }
}
