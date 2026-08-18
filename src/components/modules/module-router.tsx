'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useModuleStore } from '@/stores/module-store'
import { MODULES, type ModuleId } from '@/lib/constants'
import { DashboardModule } from './dashboard'
import { CustomersModule } from './customers'
import { LeadsModule } from './leads'
import { FollowUpsModule } from './follow-ups'
import { QuotationsModule } from './quotations'
import { OrdersModule } from './orders'
import { PaymentsModule } from './payments'
import { ProductsModule } from './products'
import { CategoriesModule } from './categories'
import { InventoryModule } from './inventory'
import { PurchaseOrdersModule } from './purchase-orders'
import { CallsModule } from './calls'
import { EmailLogsModule } from './email-logs'
import { ActivityLogsModule } from './activity-logs'
import { UsersModule } from './users'
import { ReportsModule } from './reports'
import { SettingsModule } from './settings'
import { useAuth } from '@/hooks/use-auth'
import { canAccess } from '@/lib/permissions'
import { EmptyState } from '@/components/shared/empty-state'
import { ShieldAlert } from 'lucide-react'

export function ModuleRouter() {
  const active = useModuleStore((s) => s.active)
  const setModule = useModuleStore((s) => s.set)
  const { user } = useAuth()
  const router = useRouter()
  const sp = useSearchParams()
  const hasInit = useRef(false)

  // ONE-TIME: On first mount, sync from URL ?m= to store
  useEffect(() => {
    if (hasInit.current) return
    hasInit.current = true
    const m = sp.get('m')
    if (m && MODULES.includes(m as ModuleId) && m !== active) {
      setModule(m as ModuleId)
    }
  }, [sp, active, setModule])

  // When store active changes, push to URL (so URL is always in sync)
  useEffect(() => {
    const url = new URL(window.location.href)
    const currentM = url.searchParams.get('m')
    if (currentM !== active) {
      url.searchParams.set('m', active)
      // Use router.replace so useSearchParams updates correctly
      router.replace(`?${url.searchParams.toString()}`, { scroll: false })
    }
  }, [active, router])

  if (!canAccess(user?.role, active)) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-6 w-6" />}
        title="Access restricted"
        description={`Your role (${user?.role}) does not have permission to view this module. Contact your administrator if you believe this is an error.`}
      />
    )
  }

  switch (active) {
    case 'dashboard': return <DashboardModule />
    case 'customers': return <CustomersModule />
    case 'leads': return <LeadsModule />
    case 'follow-ups': return <FollowUpsModule />
    case 'quotations': return <QuotationsModule />
    case 'orders': return <OrdersModule />
    case 'payments': return <PaymentsModule />
    case 'products': return <ProductsModule />
    case 'categories': return <CategoriesModule />
    case 'inventory': return <InventoryModule />
    case 'purchase-orders': return <PurchaseOrdersModule />
    case 'calls': return <CallsModule />
    case 'email-logs': return <EmailLogsModule />
    case 'activity-logs': return <ActivityLogsModule />
    case 'users': return <UsersModule />
    case 'reports': return <ReportsModule />
    case 'settings': return <SettingsModule />
    default: return <DashboardModule />
  }
}
