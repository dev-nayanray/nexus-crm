import type { ModuleId } from './constants'

export type Role = 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP'

// Module-level access control
export const MODULE_ACCESS: Record<ModuleId, Role[]> = {
  dashboard: ['ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  customers: ['ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  leads: ['ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  'follow-ups': ['ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  quotations: ['ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  orders: ['ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  payments: ['ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  products: ['ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  categories: ['ADMIN', 'SALES_MANAGER'],
  inventory: ['ADMIN', 'SALES_MANAGER'],
  'purchase-orders': ['ADMIN', 'SALES_MANAGER'],
  calls: ['ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  'email-logs': ['ADMIN', 'SALES_MANAGER', 'SALES_REP'],
  'activity-logs': ['ADMIN', 'SALES_MANAGER'],
  users: ['ADMIN'],
  reports: ['ADMIN', 'SALES_MANAGER'],
  settings: ['ADMIN'],
}

export function canAccess(role: string | undefined, module: ModuleId): boolean {
  if (!role) return false
  return MODULE_ACCESS[module]?.includes(role as Role) ?? false
}

export function canManage(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'SALES_MANAGER'
}

export function isAdmin(role: string | undefined): boolean {
  return role === 'ADMIN'
}

// Data scoping — Reps see only their own data; Managers+ see all
export function getDataScope(role: string | undefined, userId: string) {
  if (role === 'ADMIN' || role === 'SALES_MANAGER') {
    return { type: 'all' as const }
  }
  return { type: 'own' as const, userId }
}
