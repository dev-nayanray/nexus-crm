import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/api'

export async function POST(req: NextRequest) {
  const requiredKey = process.env.ADMIN_DEBUG_KEY
  const providedKey = req.headers.get('x-debug-key')
  if (!requiredKey || providedKey !== requiredKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if already seeded
    const userCount = await db.user.count()
    if (userCount > 0) {
      return NextResponse.json({
        success: true,
        message: 'Database already seeded',
        counts: await getCounts(),
      })
    }

    // ─── Users ────────────────────────────────────────────────────────────────
    const adminPass = await bcrypt.hash('admin123', 10)
    const managerPass = await bcrypt.hash('manager123', 10)
    const repPass = await bcrypt.hash('rep123', 10)

    const admin = await db.user.create({
      data: { name: 'Alex Morgan', email: 'admin@nexuscrm.io', passwordHash: adminPass, role: 'ADMIN', jobTitle: 'System Administrator', phone: '+1-555-0100' },
    })
    const manager = await db.user.create({
      data: { name: 'Sam Chen', email: 'manager@nexuscrm.io', passwordHash: managerPass, role: 'SALES_MANAGER', jobTitle: 'Sales Manager', phone: '+1-555-0101' },
    })
    const rep1 = await db.user.create({
      data: { name: 'Jordan Patel', email: 'rep@nexuscrm.io', passwordHash: repPass, role: 'SALES_REP', jobTitle: 'Account Executive', phone: '+1-555-0102' },
    })
    const rep2 = await db.user.create({
      data: { name: 'Casey Reyes', email: 'casey.rep@nexuscrm.io', passwordHash: repPass, role: 'SALES_REP', jobTitle: 'Sales Development Rep', phone: '+1-555-0103' },
    })
    const rep3 = await db.user.create({
      data: { name: 'Morgan Lee', email: 'morgan.rep@nexuscrm.io', passwordHash: repPass, role: 'SALES_REP', jobTitle: 'Account Executive', phone: '+1-555-0104' },
    })

    const salesUsers = [manager, rep1, rep2, rep3]

    // ─── Products & Inventory ─────────────────────────────────────────────────
    const productData = [
      { name: 'Nexus Pro License', sku: 'NX-PRO-001', category: 'Software', unit: 'PCS', price: 1499, cost: 350, taxRate: 10 },
      { name: 'Nexus Enterprise License', sku: 'NX-ENT-001', category: 'Software', unit: 'PCS', price: 4999, cost: 1100, taxRate: 10 },
      { name: 'Premium Support Plan', sku: 'SUP-PRE-001', category: 'Service', unit: 'SERVICE', price: 999, cost: 200, taxRate: 5 },
      { name: 'Onboarding Package', sku: 'ONB-PKG-001', category: 'Service', unit: 'SERVICE', price: 2499, cost: 800, taxRate: 5 },
      { name: 'API Calls Pack (100K)', sku: 'API-100K', category: 'Service', unit: 'PCS', price: 499, cost: 50, taxRate: 10 },
      { name: 'Storage Upgrade (1TB)', sku: 'STO-1TB', category: 'Service', unit: 'PCS', price: 299, cost: 80, taxRate: 10 },
      { name: 'Custom Integration', sku: 'INT-CUS-001', category: 'Service', unit: 'SERVICE', price: 3500, cost: 1200, taxRate: 5 },
      { name: 'Training Session (Full Day)', sku: 'TRN-FD-001', category: 'Service', unit: 'SERVICE', price: 1499, cost: 400, taxRate: 5 },
      { name: 'Nexus Mobile App', sku: 'APP-MOB-001', category: 'Software', unit: 'PCS', price: 499, cost: 100, taxRate: 10 },
      { name: 'Analytics Add-on', sku: 'ADD-ANA-001', category: 'Software', unit: 'PCS', price: 799, cost: 180, taxRate: 10 },
      { name: 'White-label Branding', sku: 'BRD-WL-001', category: 'Service', unit: 'SERVICE', price: 1999, cost: 500, taxRate: 5 },
      { name: 'Dedicated Server', sku: 'SRV-DED-001', category: 'Hardware', unit: 'PCS', price: 2999, cost: 1400, taxRate: 10 },
      { name: 'Backup Service (Annual)', sku: 'BKP-ANN-001', category: 'Service', unit: 'SERVICE', price: 599, cost: 120, taxRate: 5 },
      { name: 'Security Audit', sku: 'AUD-SEC-001', category: 'Service', unit: 'SERVICE', price: 4500, cost: 1500, taxRate: 5 },
      { name: 'Data Migration Service', sku: 'MIG-DAT-001', category: 'Service', unit: 'SERVICE', price: 2200, cost: 700, taxRate: 5 },
      { name: 'Premium Theme Pack', sku: 'THM-PRO-001', category: 'Software', unit: 'PCS', price: 199, cost: 30, taxRate: 10 },
      { name: 'Workflow Automation', sku: 'AUT-WFL-001', category: 'Software', unit: 'PCS', price: 899, cost: 200, taxRate: 10 },
      { name: 'Priority SLA', sku: 'SLA-PRI-001', category: 'Service', unit: 'SERVICE', price: 1499, cost: 350, taxRate: 5 },
      { name: 'Custom Report Builder', sku: 'RPT-CUS-001', category: 'Software', unit: 'PCS', price: 599, cost: 130, taxRate: 10 },
      { name: 'Multi-tenant License', sku: 'LIC-MT-001', category: 'Software', unit: 'PCS', price: 3499, cost: 800, taxRate: 10 },
    ]

    for (const p of productData) {
      const product = await db.product.create({ data: p })
      await db.inventory.create({
        data: {
          productId: product.id,
          quantity: Math.floor(Math.random() * 75) + 5,
          reserved: Math.floor(Math.random() * 5),
          reorderLevel: 10,
          location: ['Warehouse A', 'Warehouse B', 'Warehouse C'][Math.floor(Math.random() * 3)],
        },
      })
    }

    // ─── Settings ────────────────────────────────────────────────────────────
    const settings = [
      { key: 'company.name', value: 'Nexus CRM Inc.', category: 'COMPANY' },
      { key: 'company.email', value: 'hello@nexuscrm.io', category: 'COMPANY' },
      { key: 'company.address', value: '100 Market Street, San Francisco, CA 94105', category: 'COMPANY' },
      { key: 'currency.default', value: 'USD', category: 'FINANCE' },
      { key: 'tax.default', value: '10', category: 'FINANCE' },
      { key: 'quotation.validDays', value: '30', category: 'SALES' },
      { key: 'quotation.prefix', value: 'Q', category: 'SALES' },
      { key: 'order.prefix', value: 'O', category: 'SALES' },
      { key: 'payment.prefix', value: 'P', category: 'FINANCE' },
      { key: 'inventory.reorderLevel', value: '10', category: 'INVENTORY' },
    ]
    for (const s of settings) {
      await db.setting.upsert({ where: { key: s.key }, create: s, update: { value: s.value } })
    }

    const counts = await getCounts()

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully! You can now login.',
      credentials: {
        admin: 'admin@nexuscrm.io / admin123',
        manager: 'manager@nexuscrm.io / manager123',
        rep: 'rep@nexuscrm.io / rep123',
      },
      counts,
    })
  } catch (e) {
    console.error('[Seed] error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Seed failed' },
      { status: 500 }
    )
  }
}

async function getCounts() {
  const [users, customers, leads, orders, quotations, payments, products, inventory, settings] = await Promise.all([
    db.user.count(), db.customer.count(), db.lead.count(),
    db.order.count(), db.quotation.count(), db.payment.count(),
    db.product.count(), db.inventory.count(), db.setting.count(),
  ])
  return { users, customers, leads, orders, quotations, payments, products, inventory, settings }
}
