import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

// Convert lead → customer (and link)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const lead = await db.lead.findUnique({ where: { id } })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    if (lead.status === 'CONVERTED') return NextResponse.json({ error: 'Lead already converted' }, { status: 400 })

    let customer = lead.customerId
      ? await db.customer.findUnique({ where: { id: lead.customerId } })
      : null

    if (!customer) {
      customer = await db.customer.create({
        data: {
          name: lead.name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          ownerId: user.id,
          status: 'ACTIVE',
          type: 'BUSINESS',
        },
      })
    }

    const updated = await db.lead.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        stage: 'WON',
        customerId: customer.id,
        convertedAt: new Date(),
      },
    })

    if (body.createFollowUp !== false) {
      await db.followUp.create({
        data: {
          title: `Onboarding call with ${customer.name}`,
          type: 'CALL',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          assigneeId: user.id,
          customerId: customer.id,
          leadId: lead.id,
          notes: 'Auto-created follow-up after lead conversion.',
        },
      })
    }

    await logActivity({
      userId: user.id, action: 'CONVERT', entity: 'LEAD', entityId: id, entityName: lead.name,
      summary: `Converted lead "${lead.name}" to customer "${customer.name}"`,
      metadata: { customerId: customer.id },
    })

    return NextResponse.json({ lead: updated, customer })
  } catch (e) {
    return apiError(e)
  }
}
