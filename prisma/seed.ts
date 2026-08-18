import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const FIRST_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Jamie', 'Avery', 'Quinn', 'Drew', 'Reese', 'Skylar', 'Harper', 'Charlie', 'Phoenix', 'Rowan', 'Sage', 'River', 'Emerson', 'Maya', 'Liam', 'Noah', 'Olivia', 'Emma', 'Sophia', 'Lucas', 'Mia', 'Ethan', 'Ava']
const LAST_NAMES = ['Carter', 'Bennett', 'Hughes', 'Sullivan', 'Mendoza', 'Patel', 'Nguyen', 'Cohen', 'Reyes', 'Khan', 'Wong', 'Müller', 'Rossi', 'Silva', 'Tanaka', 'Kim', 'Singh', 'Okafor', 'Larsen', 'Dubois']
const COMPANIES = ['Acme Corp', 'Globex Inc', 'Stark Industries', 'Wayne Enterprises', 'Umbrella Co', 'Cyberdyne Systems', 'Massive Dynamic', 'Aperture Science', 'Black Mesa', 'Initech', 'Hooli', 'Pied Piper', 'Aviato', 'Vandelay Industries', 'Krusty Corp', 'Wonka Industries', 'Nakatomi Trading', 'Soylent Foods', 'Tyrell Corp', 'Delos Incorporated', 'Wonkavision', 'CyberComm', 'Infinitum Tech', 'Vertex Labs', 'Helix Software', 'Orbit Logistics', 'Pinnacle Foods', 'QuantaSoft', 'Stellar Health', 'Meridian Capital']
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail', 'Logistics', 'Education', 'Media', 'Energy', 'Real Estate']
const CITIES = [['New York', 'NY', 'USA'], ['San Francisco', 'CA', 'USA'], ['Austin', 'TX', 'USA'], ['Boston', 'MA', 'USA'], ['Chicago', 'IL', 'USA'], ['Seattle', 'WA', 'USA'], ['London', '', 'UK'], ['Berlin', '', 'Germany'], ['Singapore', '', 'Singapore'], ['Toronto', 'ON', 'Canada'], ['Sydney', '', 'Australia'], ['Dubai', '', 'UAE']]
const CURRENCIES = ['USD', 'EUR', 'GBP', 'USD', 'USD', 'USD']

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  }
  return out
}
function rint(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function rfloat(min: number, max: number) { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }
function name() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}` }
function email(n: string, company: string) {
  const handle = n.toLowerCase().replace(' ', '.')
  const domain = company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12) + '.com'
  return `${handle}@${domain}`
}
function daysAgo(n: number) { return new Date(Date.now() - n * 24 * 60 * 60 * 1000) }
function daysFromNow(n: number) { return new Date(Date.now() + n * 24 * 60 * 60 * 1000) }

async function main() {
  console.log('🌱 Seeding CRM database…')

  // ─── Users ────────────────────────────────────────────────────────────────
  const adminPass = await bcrypt.hash('admin123', 10)
  const managerPass = await bcrypt.hash('manager123', 10)
  const repPass = await bcrypt.hash('rep123', 10)

  const admin = await db.user.upsert({
    where: { email: 'admin@nexuscrm.io' },
    update: {},
    create: { name: 'Alex Morgan', email: 'admin@nexuscrm.io', passwordHash: adminPass, role: 'ADMIN', jobTitle: 'System Administrator', phone: '+1-555-0100' },
  })
  const manager = await db.user.upsert({
    where: { email: 'manager@nexuscrm.io' },
    update: {},
    create: { name: 'Sam Chen', email: 'manager@nexuscrm.io', passwordHash: managerPass, role: 'SALES_MANAGER', jobTitle: 'Sales Manager', phone: '+1-555-0101' },
  })
  const rep1 = await db.user.upsert({
    where: { email: 'rep@nexuscrm.io' },
    update: {},
    create: { name: 'Jordan Patel', email: 'rep@nexuscrm.io', passwordHash: repPass, role: 'SALES_REP', jobTitle: 'Account Executive', phone: '+1-555-0102' },
  })
  const rep2 = await db.user.upsert({
    where: { email: 'casey.rep@nexuscrm.io' },
    update: {},
    create: { name: 'Casey Reyes', email: 'casey.rep@nexuscrm.io', passwordHash: repPass, role: 'SALES_REP', jobTitle: 'Sales Development Rep', phone: '+1-555-0103' },
  })
  const rep3 = await db.user.upsert({
    where: { email: 'morgan.rep@nexuscrm.io' },
    update: {},
    create: { name: 'Morgan Lee', email: 'morgan.rep@nexuscrm.io', passwordHash: repPass, role: 'SALES_REP', jobTitle: 'Account Executive', phone: '+1-555-0104' },
  })
  const users = [admin, manager, rep1, rep2, rep3]
  const salesUsers = [manager, rep1, rep2, rep3]
  console.log(`  ✓ ${users.length} users`)

  // ─── Categories ─────────────────────────────────────────────────────────
  const categoryDefs = [
    { name: 'Software', description: 'Licenses, apps, and add-ons', sortOrder: 1 },
    { name: 'Service', description: 'Professional and support services', sortOrder: 2 },
    { name: 'Hardware', description: 'Physical equipment and devices', sortOrder: 3 },
  ]
  const categoryByName: Record<string, { id: string; name: string }> = {}
  for (const c of categoryDefs) {
    const slug = c.name.toLowerCase()
    const category = await db.category.upsert({
      where: { slug },
      update: {},
      create: { name: c.name, slug, description: c.description, sortOrder: c.sortOrder },
    })
    categoryByName[c.name] = category
  }
  // A couple of subcategories under Software, to demonstrate the hierarchy
  const licensesSub = await db.category.upsert({
    where: { slug: 'licenses' },
    update: {},
    create: { name: 'Licenses', slug: 'licenses', parentId: categoryByName['Software'].id, sortOrder: 1 },
  })
  const addOnsSub = await db.category.upsert({
    where: { slug: 'add-ons' },
    update: {},
    create: { name: 'Add-ons', slug: 'add-ons', parentId: categoryByName['Software'].id, sortOrder: 2 },
  })
  console.log(`  ✓ ${categoryDefs.length + 2} categories`)

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

  // Map a subset of licenses/add-ons to the new subcategories to demo hierarchy
  const subCategoryBySku: Record<string, string> = {
    'NX-PRO-001': licensesSub.id,
    'NX-ENT-001': licensesSub.id,
    'LIC-MT-001': licensesSub.id,
    'ADD-ANA-001': addOnsSub.id,
    'AUT-WFL-001': addOnsSub.id,
  }

  const products: Array<{ id: string; name: string; sku: string; price: number; cost: number; category: string | null }> = []
  for (const p of productData) {
    const categoryId = subCategoryBySku[p.sku] ?? categoryByName[p.category]?.id ?? null
    const product = await db.product.create({ data: { ...p, categoryId } })
    products.push(product)
    const initialQty = rint(5, 80)
    const inv = await db.inventory.create({
      data: {
        productId: product.id,
        quantity: initialQty,
        reserved: rint(0, 5),
        reorderLevel: 10,
        location: pick(['Warehouse A', 'Warehouse B', 'Warehouse C']),
      },
    })
    await db.stockMovement.create({
      data: {
        inventoryId: inv.id,
        productId: product.id,
        type: 'RECEIVE',
        quantityChange: initialQty,
        quantityAfter: initialQty,
        reason: 'Initial seed stock',
        userId: admin.id,
      },
    })
  }
  console.log(`  ✓ ${products.length} products + inventory + stock movements`)

  // ─── Customers ───────────────────────────────────────────────────────────
  const customers: Array<{ id: string; name: string; company: string; email: string; ownerId: string }> = []
  for (let i = 0; i < 30; i++) {
    const companyName = COMPANIES[i % COMPANIES.length]
    const contactName = name()
    const [city, state, country] = pick(CITIES)
    const owner = pick(salesUsers)
    const customer = await db.customer.create({
      data: {
        name: contactName,
        company: companyName,
        email: email(contactName, companyName),
        phone: `+1-555-${String(rint(100, 999))}`,
        website: `https://${companyName.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        address: `${rint(100, 9999)} Main Street`,
        city, state, country,
        postalCode: String(rint(10000, 99999)),
        type: 'BUSINESS',
        status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']),
        industry: pick(INDUSTRIES),
        annualRevenue: rint(500000, 50000000),
        employees: pick([10, 25, 50, 100, 250, 500, 1000, 2500]),
        ownerId: owner.id,
        createdAt: daysAgo(rint(1, 180)),
      },
    })
    customers.push(customer)
  }
  console.log(`  ✓ ${customers.length} customers`)

  // ─── Leads ───────────────────────────────────────────────────────────────
  const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']
  const SOURCES = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EVENT', 'ADS', 'OTHER']
  const leads: Array<{ id: string; name: string; value: number; stage: string; status: string; customerId: string | null; ownerId: string }> = []
  for (let i = 0; i < 50; i++) {
    const stage = pick(STAGES)
    const status = stage === 'WON' ? 'CONVERTED' : stage === 'LOST' ? 'LOST' : 'OPEN'
    const company = pick(COMPANIES)
    const leadName = name()
    const owner = pick(salesUsers)
    const linkedCustomer = (stage === 'WON' && Math.random() > 0.5) ? pick(customers) : null

    const lead = await db.lead.create({
      data: {
        name: leadName,
        company,
        email: email(leadName, company),
        phone: `+1-555-${String(rint(100, 999))}`,
        title: pick(['CTO', 'VP Engineering', 'Head of Operations', 'Procurement Manager', 'CEO', 'IT Director']),
        source: pick(SOURCES),
        stage,
        status,
        value: rfloat(1000, 50000),
        currency: pick(CURRENCIES),
        probability: stage === 'WON' ? 100 : stage === 'LOST' ? 0 : rint(10, 80),
        ownerId: owner.id,
        customerId: linkedCustomer?.id ?? null,
        notes: pick(['Interested in enterprise tier.', 'Needs custom integration with legacy system.', 'Budget pending Q3 approval.', 'Comparing with two competitors.', 'Wants demo for procurement team.']),
        expectedCloseDate: daysFromNow(rint(7, 90)),
        convertedAt: stage === 'WON' ? daysAgo(rint(1, 60)) : null,
        lostReason: stage === 'LOST' ? pick(['Went with competitor', 'Budget cut', 'No response', 'Timing not right']) : null,
        createdAt: daysAgo(rint(1, 120)),
      },
    })
    leads.push(lead)
  }
  console.log(`  ✓ ${leads.length} leads`)

  // ─── Follow-ups ──────────────────────────────────────────────────────────
  for (let i = 0; i < 35; i++) {
    const lead = pick(leads)
    const customer = pick(customers)
    const owner = pick(salesUsers)
    const due = daysFromNow(rint(-7, 14)) // some overdue, some future
    const isOverdue = due < new Date()
    await db.followUp.create({
      data: {
        title: pick([
          `Follow-up call with ${customer.company}`,
          `Send proposal to ${lead.company}`,
          `Demo scheduling with ${customer.name}`,
          `Check in on ${lead.company} decision`,
          `Onboarding call with ${customer.name}`,
          `QBR with ${customer.company}`,
        ]),
        type: pick(['CALL', 'EMAIL', 'MEETING', 'TASK']),
        status: isOverdue ? (Math.random() > 0.5 ? 'OVERDUE' : 'DONE') : pick(['PENDING', 'PENDING', 'DONE']),
        priority: pick(['LOW', 'MEDIUM', 'HIGH', 'MEDIUM']),
        dueDate: due,
        completedAt: !isOverdue && Math.random() > 0.5 ? daysAgo(rint(0, 3)) : null,
        notes: 'Auto-generated follow-up task.',
        assigneeId: owner.id,
        customerId: customer.id,
        leadId: Math.random() > 0.5 ? lead.id : null,
        createdAt: daysAgo(rint(1, 14)),
      },
    })
  }
  console.log(`  ✓ 35 follow-ups`)

  // ─── Quotations ──────────────────────────────────────────────────────────
  const quotations: Array<{ id: string; number: string; customerId: string; total: number; currency: string; status: string; ownerId: string; items: any[] }> = []
  for (let i = 0; i < 40; i++) {
    const customer = pick(customers)
    const owner = pick(salesUsers)
    const status = pick(['DRAFT', 'SENT', 'SENT', 'ACCEPTED', 'ACCEPTED', 'REJECTED', 'EXPIRED'])
    const numItems = rint(1, 4)
    const chosenProducts = pickN(products, numItems)
    const items = chosenProducts.map((p) => ({
      productId: p.id,
      description: p.name,
      qty: rint(1, 10),
      unitPrice: p.price,
      discount: pick([0, 0, 5, 10]),
      taxRate: p.taxRate ?? 10,
      total: 0,
    }))
    let subtotal = 0, taxAmount = 0
    for (const it of items) {
      const ls = it.qty * it.unitPrice
      const ld = ls * (it.discount / 100)
      const lt = (ls - ld) * (it.taxRate / 100)
      subtotal += ls
      taxAmount += lt
      it.total = ls - ld + lt
    }
    const currency = pick(CURRENCIES)
    const q = await db.quotation.create({
      data: {
        number: `Q-2025-${String(i + 1).padStart(5, '0')}`,
        customerId: customer.id,
        ownerId: owner.id,
        subject: pick([
          'Nexus Pro — Annual License',
          'Enterprise Platform Subscription',
          'Implementation & Onboarding Package',
          'Custom Integration Proposal',
          'Premium Support & Training',
          'Multi-product Bundle',
        ]),
        status,
        validUntil: daysFromNow(rint(7, 30)),
        sentAt: status !== 'DRAFT' ? daysAgo(rint(1, 14)) : null,
        acceptedAt: status === 'ACCEPTED' ? daysAgo(rint(1, 7)) : null,
        notes: 'Thank you for your business.',
        terms: 'Net 30. Prices valid for 30 days.',
        taxRate: 0,
        discount: pick([0, 0, 5, 10]),
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        currency,
        createdAt: daysAgo(rint(1, 60)),
        items: { create: items },
      },
      include: { items: true },
    })
    quotations.push({ id: q.id, number: q.number, customerId: q.customerId, total: q.total, currency: q.currency, status: q.status, ownerId: q.ownerId, items: q.items })
  }
  console.log(`  ✓ ${quotations.length} quotations`)

  // ─── Orders ──────────────────────────────────────────────────────────────
  const orders: Array<{ id: string; number: string; customerId: string; total: number; paidAmount: number; currency: string; status: string; paymentStatus: string; ownerId?: string }> = []
  const acceptedQuotations = quotations.filter(q => q.status === 'ACCEPTED')
  const shuffledQuotations = [...acceptedQuotations].sort(() => Math.random() - 0.5)
  for (let i = 0; i < Math.min(30, shuffledQuotations.length); i++) {
    const q = shuffledQuotations[i]
    const customer = customers.find(c => c.id === q.customerId)!
    const owner = pick(salesUsers)
    const orderStatus = pick(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'DELIVERED', 'CANCELLED'])
    const paymentStatus = orderStatus === 'CANCELLED' ? 'UNPAID' : pick(['UNPAID', 'PARTIAL', 'PAID', 'PAID'])
    let paidAmount = 0
    if (paymentStatus === 'PAID') paidAmount = q.total
    else if (paymentStatus === 'PARTIAL') paidAmount = Math.round(q.total * 0.5 * 100) / 100

    const order = await db.order.create({
      data: {
        number: `O-2025-${String(i + 1).padStart(5, '0')}`,
        customerId: customer.id,
        quotationId: q.id,
        ownerId: owner.id,
        status: orderStatus,
        paymentStatus,
        fulfillmentStatus: orderStatus === 'DELIVERED' ? 'FULFILLED' : orderStatus === 'SHIPPED' ? 'PARTIAL' : 'UNFULFILLED',
        subtotal: q.total - Math.round(q.total * 0.1 * 100) / 100,
        taxRate: 10,
        taxAmount: Math.round(q.total * 0.1 * 100) / 100,
        discount: 0,
        shipping: 0,
        total: q.total,
        paidAmount,
        currency: q.currency,
        orderDate: daysAgo(rint(1, 45)),
        shippedAt: orderStatus === 'SHIPPED' || orderStatus === 'DELIVERED' ? daysAgo(rint(1, 10)) : null,
        deliveredAt: orderStatus === 'DELIVERED' ? daysAgo(rint(1, 5)) : null,
        cancelledAt: orderStatus === 'CANCELLED' ? daysAgo(rint(1, 3)) : null,
        items: {
          create: q.items.map((it: any) => ({
            productId: it.productId,
            description: it.description,
            qty: it.qty,
            unitPrice: it.unitPrice,
            discount: it.discount,
            taxRate: it.taxRate,
            total: it.total,
          })),
        },
      },
    })
    orders.push({ id: order.id, number: order.number, customerId: order.customerId, total: order.total, paidAmount: order.paidAmount, currency: order.currency, status: order.status, paymentStatus: order.paymentStatus, ownerId: owner.id })
  }
  // If we need more orders than quotations, add some standalone orders
  for (let i = shuffledQuotations.length; i < 30; i++) {
    const customer = pick(customers)
    const owner = pick(salesUsers)
    const items = pickN(products, rint(1, 3)).map((p) => ({
      productId: p.id, description: p.name, qty: rint(1, 5), unitPrice: p.price, discount: 0, taxRate: p.taxRate ?? 10, total: 0,
    }))
    let subtotal = 0
    for (const it of items) { it.total = it.qty * it.unitPrice; subtotal += it.total }
    const orderStatus = pick(['PENDING', 'CONFIRMED', 'DELIVERED'])
    const paymentStatus = orderStatus === 'DELIVERED' ? 'PAID' : 'UNPAID'
    const order = await db.order.create({
      data: {
        number: `O-2025-${String(i + 1).padStart(5, '0')}`,
        customerId: customer.id,
        ownerId: owner.id,
        status: orderStatus,
        paymentStatus,
        subtotal,
        taxRate: 10,
        taxAmount: Math.round(subtotal * 0.1 * 100) / 100,
        discount: 0, shipping: 0,
        total: Math.round(subtotal * 1.1 * 100) / 100,
        paidAmount: paymentStatus === 'PAID' ? Math.round(subtotal * 1.1 * 100) / 100 : 0,
        currency: 'USD',
        orderDate: daysAgo(rint(1, 45)),
        items: { create: items },
      },
    })
    orders.push({ id: order.id, number: order.number, customerId: order.customerId, total: order.total, paidAmount: order.paidAmount, currency: order.currency, status: order.status, paymentStatus: order.paymentStatus, ownerId: owner.id })
  }
  console.log(`  ✓ ${orders.length} orders`)

  // ─── Payments ────────────────────────────────────────────────────────────
  let paymentIdx = 0
  for (const order of orders) {
    if (order.paymentStatus === 'UNPAID' || order.status === 'CANCELLED') continue
    if (order.paymentStatus === 'PAID') {
      await db.payment.create({
        data: {
          number: `P-2025-${String(++paymentIdx).padStart(5, '0')}`,
          orderId: order.id,
          customerId: order.customerId,
          ownerId: order.ownerId ?? pick(salesUsers).id,
          amount: order.total,
          method: pick(['BANK_TRANSFER', 'CREDIT_CARD', 'PAYPAL', 'CHECK']),
          status: 'COMPLETED',
          paidAt: daysAgo(rint(1, 30)),
          currency: order.currency,
        },
      })
    } else if (order.paymentStatus === 'PARTIAL') {
      await db.payment.create({
        data: {
          number: `P-2025-${String(++paymentIdx).padStart(5, '0')}`,
          orderId: order.id,
          customerId: order.customerId,
          ownerId: order.ownerId ?? pick(salesUsers).id,
          amount: order.paidAmount,
          method: pick(['BANK_TRANSFER', 'CREDIT_CARD']),
          status: 'COMPLETED',
          paidAt: daysAgo(rint(1, 30)),
          currency: order.currency,
        },
      })
      // Pending second payment
      await db.payment.create({
        data: {
          number: `P-2025-${String(++paymentIdx).padStart(5, '0')}`,
          orderId: order.id,
          customerId: order.customerId,
          ownerId: order.ownerId ?? pick(salesUsers).id,
          amount: Math.round((order.total - order.paidAmount) * 100) / 100,
          method: pick(['BANK_TRANSFER', 'CREDIT_CARD']),
          status: 'PENDING',
          currency: order.currency,
        },
      })
    }
  }
  console.log(`  ✓ ${paymentIdx} payments`)

  // ─── Calls & Messages ────────────────────────────────────────────────────
  for (let i = 0; i < 25; i++) {
    const customer = pick(customers)
    const lead = pick(leads)
    await db.call.create({
      data: {
        type: pick(['CALL', 'CALL', 'CALL', 'MESSAGE']),
        direction: pick(['INBOUND', 'OUTBOUND', 'OUTBOUND']),
        status: pick(['COMPLETED', 'COMPLETED', 'MISSED', 'SCHEDULED']),
        duration: rint(15, 1800),
        subject: pick([`Discovery call with ${customer.company}`, `Demo scheduling`, `Pricing discussion`, `Follow-up on quote`, `Technical questions`, null]),
        notes: pick(['Discussed pricing and timeline.', 'Customer requested additional demo.', 'Will send proposal tomorrow.', 'No answer, left voicemail.', 'Confirmed next steps.']),
        customerId: Math.random() > 0.3 ? customer.id : null,
        leadId: Math.random() > 0.5 ? lead.id : null,
        userId: pick(salesUsers).id,
        startedAt: daysAgo(rint(0, 30)),
      },
    })
  }
  console.log(`  ✓ 25 calls/messages`)

  // ─── Email logs ──────────────────────────────────────────────────────────
  for (let i = 0; i < 20; i++) {
    const customer = pick(customers)
    await db.emailLog.create({
      data: {
        to: customer.email,
        from: pick(salesUsers).email,
        subject: pick([
          'Your Nexus CRM Quote',
          'Following up on our conversation',
          'Welcome to Nexus CRM',
          'Invoice for Order',
          'Product Demo Scheduled',
          'Q4 Account Review',
        ]),
        body: 'Hello, thank you for your interest in Nexus CRM. Please find the requested information attached. Let me know if you have any questions.',
        status: pick(['SENT', 'DELIVERED', 'OPENED', 'OPENED', 'SENT']),
        customerId: customer.id,
        userId: pick(salesUsers).id,
        sentAt: daysAgo(rint(0, 30)),
        openedAt: Math.random() > 0.5 ? daysAgo(rint(0, 20)) : null,
      },
    })
  }
  console.log(`  ✓ 20 email logs`)

  // ─── Purchase Orders ─────────────────────────────────────────────────────
  const SUPPLIERS = ['CloudOps Hosting', 'TechGear Wholesale', 'Office Supplies Co', 'Software License Hub', 'Hardware Direct Inc']
  for (let i = 0; i < 8; i++) {
    const supplier = pick(SUPPLIERS)
    const numItems = rint(1, 3)
    const items = pickN(products, numItems).map((p) => ({
      productId: p.id,
      description: p.name,
      qty: rint(10, 100),
      unitPrice: p.cost,
      total: 0,
    }))
    let subtotal = 0
    for (const it of items) { it.total = it.qty * it.unitPrice; subtotal += it.total }
    const status = pick(['DRAFT', 'SENT', 'SENT', 'RECEIVED', 'PARTIAL', 'CANCELLED'])
    await db.purchaseOrder.create({
      data: {
        number: `PO-2025-${String(i + 1).padStart(5, '0')}`,
        supplier,
        supplierEmail: `procurement@${supplier.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        supplierPhone: `+1-555-${String(rint(100, 999))}`,
        ownerId: pick(salesUsers).id,
        status,
        subtotal,
        taxAmount: 0,
        total: subtotal,
        expectedDate: daysFromNow(rint(7, 30)),
        receivedAt: status === 'RECEIVED' ? daysAgo(rint(1, 5)) : null,
        notes: 'Standard procurement order.',
        items: { create: items },
      },
    })
  }
  console.log(`  ✓ 8 purchase orders`)

  // ─── Activity logs ───────────────────────────────────────────────────────
  const actions = ['CREATE', 'UPDATE', 'STATUS_CHANGE', 'CONVERT', 'CREATE', 'CREATE']
  const entities = ['CUSTOMER', 'LEAD', 'ORDER', 'QUOTATION', 'PAYMENT', 'PRODUCT']
  for (let i = 0; i < 50; i++) {
    const action = pick(actions)
    const entity = pick(entities)
    await db.activityLog.create({
      data: {
        userId: pick(users).id,
        action,
        entity,
        entityId: 'seed-' + i,
        entityName: pick([...COMPANIES, ...products.map(p => p.name)]),
        summary: pick([
          `Created new ${entity.toLowerCase()}`,
          `Updated ${entity.toLowerCase()} details`,
          `Changed status of ${entity.toLowerCase()}`,
          `Converted lead to customer`,
          `Recorded payment`,
          `Sent quotation`,
        ]),
        createdAt: daysAgo(rint(0, 30)),
      },
    })
  }
  console.log(`  ✓ 50 activity logs`)

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
    await db.setting.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value },
    })
  }
  console.log(`  ✓ ${settings.length} settings`)

  console.log('✅ Seed complete!')
  console.log('\nLogin credentials:')
  console.log('  Admin:    admin@nexuscrm.io / admin123')
  console.log('  Manager:  manager@nexuscrm.io / manager123')
  console.log('  Rep:      rep@nexuscrm.io / rep123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
