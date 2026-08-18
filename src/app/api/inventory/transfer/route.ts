import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, apiError, logActivity } from '@/lib/api'

const Schema = z.object({
  productId: z.string().min(1),
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  quantity: z.number().int().positive(),
  reason: z.string().optional().nullable(),
})

// Moves stock from one warehouse to another for a single product, atomically.
// Writes two linked StockMovement rows (TRANSFER_OUT / TRANSFER_IN) sharing a
// reference id, so the ledger stays symmetric and fully auditable.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const parsed = Schema.parse(body)

    if (parsed.fromWarehouseId === parsed.toWarehouseId) {
      return NextResponse.json({ error: 'Source and destination warehouse must differ' }, { status: 400 })
    }

    const reference = `transfer_${Date.now()}`

    const result = await db.$transaction(async (tx) => {
      const source = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId: parsed.productId, warehouseId: parsed.fromWarehouseId } },
        include: { product: { select: { name: true, sku: true } } },
      })
      if (!source || source.quantity < parsed.quantity) {
        throw Object.assign(new Error('Not enough stock in the source warehouse for this transfer'), { status: 409 })
      }

      const updatedSource = await tx.inventory.update({
        where: { id: source.id },
        data: { quantity: { decrement: parsed.quantity }, lastStockDate: new Date() },
      })

      const updatedDest = await tx.inventory.upsert({
        where: { productId_warehouseId: { productId: parsed.productId, warehouseId: parsed.toWarehouseId } },
        update: { quantity: { increment: parsed.quantity }, lastStockDate: new Date() },
        create: {
          productId: parsed.productId,
          warehouseId: parsed.toWarehouseId,
          quantity: parsed.quantity,
          reorderLevel: 10,
          lastStockDate: new Date(),
        },
      })

      await tx.stockMovement.create({
        data: {
          inventoryId: updatedSource.id,
          productId: parsed.productId,
          warehouseId: parsed.fromWarehouseId,
          type: 'TRANSFER_OUT',
          quantityChange: -parsed.quantity,
          quantityAfter: updatedSource.quantity,
          reason: parsed.reason ?? `Transferred to warehouse ${parsed.toWarehouseId}`,
          reference,
          userId: user.id,
        },
      })
      await tx.stockMovement.create({
        data: {
          inventoryId: updatedDest.id,
          productId: parsed.productId,
          warehouseId: parsed.toWarehouseId,
          type: 'TRANSFER_IN',
          quantityChange: parsed.quantity,
          quantityAfter: updatedDest.quantity,
          reason: parsed.reason ?? `Transferred from warehouse ${parsed.fromWarehouseId}`,
          reference,
          userId: user.id,
        },
      })

      return { source: updatedSource, destination: updatedDest, reference, productName: source.product?.name }
    })

    await logActivity({
      userId: user.id, action: 'UPDATE', entity: 'INVENTORY', entityId: result.destination.id, entityName: result.productName,
      summary: `Transferred ${parsed.quantity} units of ${result.productName} between warehouses`,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (e: any) {
    if (e?.status === 409) return NextResponse.json({ error: e.message }, { status: 409 })
    return apiError(e)
  }
}
