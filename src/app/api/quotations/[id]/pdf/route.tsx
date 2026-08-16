import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, apiError } from '@/lib/api'
import { QuotationDocument } from '@/lib/pdf-documents'
import type { Quotation, CompanyInfo } from '@/lib/pdf-types'
import { renderToBuffer } from '@react-pdf/renderer'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser()
    const { id } = await params

    const quotation = await db.quotation.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, company: true, email: true, phone: true, address: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
    })

    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })

    const settings = await db.setting.findMany()
    const settingsMap: Record<string, string> = {}
    for (const s of settings) settingsMap[s.key] = s.value

    const company: CompanyInfo = {
      name: settingsMap['company.name'] ?? 'Nexus CRM Inc.',
      email: settingsMap['company.email'] ?? 'hello@nexuscrm.io',
      address: settingsMap['company.address'] ?? '100 Market Street, San Francisco, CA 94105',
    }

    const quotationData: Quotation = {
      ...quotation,
      createdAt: quotation.createdAt,
      items: quotation.items.map((it) => ({
        id: it.id,
        description: it.description,
        qty: it.qty,
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxRate: it.taxRate,
        total: it.total,
      })),
    }

    const pdfBuffer = await renderToBuffer(<QuotationDocument quotation={quotationData} company={company} />)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="quotation-${quotation.number}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (e) {
    return apiError(e)
  }
}
