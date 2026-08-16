import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { handleCsvExport } from '@/lib/csv-export'

export async function GET(req: NextRequest) {
  return handleCsvExport(req, {
    entity: 'PRODUCT',
    filename: 'products',
    model: db.product,
    include: { inventory: true },
    fields: [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'unit', label: 'Unit' },
      { key: 'price', label: 'Price' },
      { key: 'cost', label: 'Cost' },
      { key: 'taxRate', label: 'Tax Rate (%)' },
      { key: 'status', label: 'Status' },
      { key: 'inventory.quantity', label: 'Stock' },
      { key: 'inventory.reorderLevel', label: 'Reorder Level' },
      { key: 'inventory.location', label: 'Location' },
      { key: 'createdAt', label: 'Created', accessor: (r) => r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '' },
    ],
  })
}
