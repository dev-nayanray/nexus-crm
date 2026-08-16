import { Role } from './permissions'

export const MODULES = [
  'dashboard',
  'customers',
  'leads',
  'follow-ups',
  'quotations',
  'orders',
  'payments',
  'products',
  'inventory',
  'purchase-orders',
  'calls',
  'email-logs',
  'activity-logs',
  'users',
  'reports',
  'settings',
] as const

export type ModuleId = (typeof MODULES)[number]

export const NAV_GROUPS: Array<{
  id: string
  label: string
  items: Array<{ id: ModuleId; label: string; icon: string }>
}> = [
  {
    id: 'pipeline',
    label: 'Pipeline',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { id: 'leads', label: 'Leads', icon: 'Target' },
      { id: 'customers', label: 'Customers', icon: 'Users' },
      { id: 'follow-ups', label: 'Follow-ups', icon: 'CalendarClock' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { id: 'quotations', label: 'Quotations', icon: 'FileText' },
      { id: 'orders', label: 'Orders', icon: 'ShoppingCart' },
      { id: 'payments', label: 'Payments', icon: 'CreditCard' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    items: [
      { id: 'products', label: 'Products', icon: 'Package' },
      { id: 'inventory', label: 'Inventory', icon: 'Warehouse' },
      { id: 'purchase-orders', label: 'Purchase Orders', icon: 'Truck' },
    ],
  },
  {
    id: 'comms',
    label: 'Communications',
    items: [
      { id: 'calls', label: 'Calls & Messages', icon: 'Phone' },
      { id: 'email-logs', label: 'Email Logs', icon: 'Mail' },
      { id: 'activity-logs', label: 'Activity Logs', icon: 'History' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      { id: 'users', label: 'Users & Roles', icon: 'ShieldCheck' },
      { id: 'reports', label: 'Reports & KPIs', icon: 'BarChart3' },
      { id: 'settings', label: 'Settings', icon: 'Settings' },
    ],
  },
]

export const MODULE_LABELS: Record<ModuleId, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  leads: 'Leads',
  'follow-ups': 'Follow-ups',
  quotations: 'Quotations',
  orders: 'Orders',
  payments: 'Payments',
  products: 'Products',
  inventory: 'Inventory',
  'purchase-orders': 'Purchase Orders',
  calls: 'Calls & Messages',
  'email-logs': 'Email Logs',
  'activity-logs': 'Activity Logs',
  users: 'Users & Roles',
  reports: 'Reports & KPIs',
  settings: 'Settings',
}

// ─── Status configs ─────────────────────────────────────────────────────────

export type StatusConfig = Record<string, { label: string; color: string }>

export const LEAD_STAGES: StatusConfig = {
  NEW: { label: 'New', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  CONTACTED: { label: 'Contacted', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  QUALIFIED: { label: 'Qualified', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  PROPOSAL: { label: 'Proposal', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  NEGOTIATION: { label: 'Negotiation', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  WON: { label: 'Won', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  LOST: { label: 'Lost', color: 'bg-rose-100 text-rose-700 border-rose-200' },
}

export const LEAD_SOURCES = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EVENT', 'ADS', 'OTHER']

export const ORDER_STATUSES: StatusConfig = {
  PENDING: { label: 'Pending', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  PROCESSING: { label: 'Processing', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  SHIPPED: { label: 'Shipped', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  REFUNDED: { label: 'Refunded', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
}

export const PAYMENT_STATUS: StatusConfig = {
  UNPAID: { label: 'Unpaid', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  PARTIAL: { label: 'Partial', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  PAID: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  OVERPAID: { label: 'Overpaid', color: 'bg-violet-100 text-violet-700 border-violet-200' },
}

export const QUOTATION_STATUSES: StatusConfig = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  SENT: { label: 'Sent', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  ACCEPTED: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejected', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  EXPIRED: { label: 'Expired', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  CONVERTED: { label: 'Converted', color: 'bg-violet-100 text-violet-700 border-violet-200' },
}

export const PAYMENT_METHODS = ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'CHECK', 'OTHER']

export const PAYMENT_RECORD_STATUSES: StatusConfig = {
  PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  FAILED: { label: 'Failed', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  REFUNDED: { label: 'Refunded', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
}

export const FOLLOWUP_TYPES = ['CALL', 'EMAIL', 'MEETING', 'TASK', 'OTHER']

export const FOLLOWUP_STATUSES: StatusConfig = {
  PENDING: { label: 'Pending', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  DONE: { label: 'Done', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  SKIPPED: { label: 'Skipped', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  OVERDUE: { label: 'Overdue', color: 'bg-rose-100 text-rose-700 border-rose-200' },
}

export const FOLLOWUP_PRIORITIES: StatusConfig = {
  LOW: { label: 'Low', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  MEDIUM: { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  HIGH: { label: 'High', color: 'bg-rose-100 text-rose-700 border-rose-200' },
}

export const CUSTOMER_STATUSES: StatusConfig = {
  ACTIVE: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  INACTIVE: { label: 'Inactive', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  BLACKLISTED: { label: 'Blacklisted', color: 'bg-rose-100 text-rose-700 border-rose-200' },
}

export const CUSTOMER_TYPES = ['INDIVIDUAL', 'BUSINESS']

export const PRODUCT_STATUSES: StatusConfig = {
  ACTIVE: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  DISCONTINUED: { label: 'Discontinued', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
}

export const PO_STATUSES: StatusConfig = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  SENT: { label: 'Sent', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  PARTIAL: { label: 'Partial', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  RECEIVED: { label: 'Received', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-100 text-rose-700 border-rose-200' },
}

export const CALL_TYPES: StatusConfig = {
  CALL: { label: 'Call', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  MESSAGE: { label: 'Message', color: 'bg-violet-100 text-violet-700 border-violet-200' },
}

export const CALL_STATUSES: StatusConfig = {
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  MISSED: { label: 'Missed', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  FAILED: { label: 'Failed', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  SCHEDULED: { label: 'Scheduled', color: 'bg-amber-100 text-amber-700 border-amber-200' },
}

export const EMAIL_STATUSES: StatusConfig = {
  SENT: { label: 'Sent', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  OPENED: { label: 'Opened', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  FAILED: { label: 'Failed', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  BOUNCED: { label: 'Bounced', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
}

export const ROLES: Record<Role, { label: string; color: string; description: string }> = {
  ADMIN: {
    label: 'Administrator',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    description: 'Full access to all modules, user management, and system settings.',
  },
  SALES_MANAGER: {
    label: 'Sales Manager',
    color: 'bg-violet-100 text-violet-700 border-violet-200',
    description: 'Manage team customers, leads, orders, and payments. View reports.',
  },
  SALES_REP: {
    label: 'Sales Rep',
    color: 'bg-sky-100 text-sky-700 border-sky-200',
    description: 'Manage own customers, leads, orders, and payments.',
  },
}

export const ACTIVITY_ACTIONS: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Created', color: 'text-emerald-600' },
  UPDATE: { label: 'Updated', color: 'text-sky-600' },
  DELETE: { label: 'Deleted', color: 'text-rose-600' },
  CONVERT: { label: 'Converted', color: 'text-violet-600' },
  STATUS_CHANGE: { label: 'Status changed', color: 'text-amber-600' },
  LOGIN: { label: 'Logged in', color: 'text-slate-600' },
  LOGOUT: { label: 'Logged out', color: 'text-slate-600' },
}

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'AED']
