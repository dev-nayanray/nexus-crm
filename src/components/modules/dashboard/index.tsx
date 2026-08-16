'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Users, Target, ShoppingCart, DollarSign, CalendarClock, PackageX,
  ArrowUpRight, TrendingUp, Activity,
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart, Cell, Legend, Pie, PieChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/stat-card'
import { CardSkeleton, TableSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatCurrency, formatRelative, initials } from '@/lib/utils'
import { LEAD_STAGES, ACTIVITY_ACTIONS, ORDER_STATUSES } from '@/lib/constants'
import { useModuleStore } from '@/stores/module-store'
import { Button } from '@/components/ui/button'

const LEAD_STAGE_COLORS: Record<string, string> = {
  NEW: '#94a3b8', CONTACTED: '#0ea5e9', QUALIFIED: '#8b5cf6',
  PROPOSAL: '#f59e0b', NEGOTIATION: '#f97316', WON: '#10b981', LOST: '#ef4444',
}

const ACTIVITY_ICONS: Record<string, string> = {
  CREATE: '➕', UPDATE: '✏️', DELETE: '🗑️', CONVERT: '🔄', STATUS_CHANGE: '⇄', LOGIN: '🔑', LOGOUT: '👋',
}

export function DashboardModule() {
  const setModule = useModuleStore((s) => s.set)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to load dashboard')
      return res.json()
    },
  })

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <CardSkeleton count={4} />
        <div className="grid gap-4 lg:grid-cols-3">
          <TableSkeleton rows={5} cols={3} className="lg:col-span-2" />
          <TableSkeleton rows={5} cols={2} />
        </div>
      </div>
    )
  }

  const { kpis, recentLeads, recentOrders, recentActivity, leadStageAgg, revenueByMonth, topCustomers } = data

  return (
    <div className="space-y-6">
      {/* Hero KPI Cards — cleaner, more impactful */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          icon={DollarSign}
          hint="completed payments"
          trend={{ value: 12.5, positive: true }}
          accent="emerald"
        />
        <StatCard
          label="Pipeline Value"
          value={formatCurrency(kpis.pipelineValue)}
          icon={Target}
          hint={`${kpis.openLeads} open leads`}
          accent="sky"
        />
        <StatCard
          label="Active Orders"
          value={kpis.openOrders}
          icon={ShoppingCart}
          hint={`of ${kpis.orders} total`}
          accent="violet"
        />
        <StatCard
          label="Customers"
          value={kpis.customers}
          icon={Users}
          hint="in pipeline"
          trend={{ value: 8.2, positive: true }}
          accent="amber"
        />
      </div>

      {/* Consolidated alerts — subtle, not screaming */}
      <div className="grid gap-3 sm:grid-cols-3">
        <AlertCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Overdue follow-ups"
          value={kpis.overdueFollowUps}
          tone="rose"
          onClick={() => setModule('follow-ups')}
        />
        <AlertCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Pending payments"
          value={kpis.pendingPayments}
          tone="amber"
          onClick={() => setModule('payments')}
        />
        <AlertCard
          icon={<PackageX className="h-4 w-4" />}
          label="Low stock items"
          value={kpis.lowStockProducts}
          tone="violet"
          onClick={() => setModule('inventory')}
        />
      </div>

      {/* Charts row — better hierarchy */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue trend — larger, primary */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">Revenue Trend</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              +12.5%
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueByMonth} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.94 0.004 256)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'oklch(0.52 0.015 256)' }}
                  tickFormatter={(m) => {
                    const [y, mo] = m.split('-')
                    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('en-US', { month: 'short' })
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: 'oklch(0.52 0.015 256)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                  contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.94 0.004 256)', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead stage distribution — cleaner */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Leads by Stage</CardTitle>
            <p className="text-xs text-muted-foreground">Pipeline distribution</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={leadStageAgg}
                  dataKey="count"
                  nameKey="stage"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  stroke="none"
                >
                  {leadStageAgg.map((entry: any) => (
                    <Cell key={entry.stage} fill={LEAD_STAGE_COLORS[entry.stage] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.94 0.004 256)', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: number, _n, p: any) => [v, p?.payload?.stage ?? '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
              {leadStageAgg.slice(0, 6).map((s: any) => (
                <div key={s.stage} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: LEAD_STAGE_COLORS[s.stage] ?? '#94a3b8' }} />
                  <span className="text-muted-foreground">{LEAD_STAGES[s.stage]?.label ?? s.stage}</span>
                  <span className="ml-auto font-medium text-foreground">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lists row — unified activity feed + recent leads */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent leads — cleaner cards */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Recent Leads</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setModule('leads')}>
              View all <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {recentLeads.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No recent leads</p>
            ) : (
              recentLeads.map((lead: any) => (
                <button
                  key={lead.id}
                  onClick={() => setModule('leads')}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-[10px] font-medium text-white">{initials(lead.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{lead.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{lead.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-foreground">{formatCurrency(lead.value, lead.currency)}</p>
                    <StatusBadge label={LEAD_STAGES[lead.stage]?.label ?? lead.stage} className={LEAD_STAGES[lead.stage]?.color} />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setModule('orders')}>
              View all <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {recentOrders.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No recent orders</p>
            ) : (
              recentOrders.map((order: any) => (
                <button
                  key={order.id}
                  onClick={() => setModule('orders')}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 text-[10px] font-semibold text-white">
                    {order.number.slice(-3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{order.customer?.company}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{order.number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-foreground">{formatCurrency(order.total, order.currency)}</p>
                    <StatusBadge label={ORDER_STATUSES[order.status]?.label ?? order.status} className={ORDER_STATUSES[order.status]?.color} />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Activity feed — timeline style with better spacing */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity className="h-4 w-4 text-emerald-500" />
              Activity Feed
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setModule('activity-logs')}>
              View all <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {recentActivity.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No recent activity</p>
            ) : (
              recentActivity.slice(0, 6).map((a: any) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-sm">{ACTIVITY_ICONS[a.action] ?? '•'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground">
                      <span className="font-semibold">{a.user?.name ?? 'System'}</span>{' '}
                      <span className="text-muted-foreground">{a.summary}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(a.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top customers — cleaner bar chart */}
      {topCustomers.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Top Customers by Revenue</CardTitle>
            <p className="text-xs text-muted-foreground">Highest-value accounts</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topCustomers} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.94 0.004 256)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'oklch(0.52 0.015 256)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="company" tick={{ fontSize: 11, fill: 'oklch(0.52 0.015 256)' }} axisLine={false} tickLine={false} width={130} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                  contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.94 0.004 256)', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="totalRevenue" fill="#10b981" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AlertCard({ icon, label, value, tone, onClick }: {
  icon: React.ReactNode
  label: string
  value: number
  tone: 'rose' | 'amber' | 'violet'
  onClick?: () => void
}) {
  const TONES = {
    rose: 'border-rose-200/60 bg-rose-50/50 hover:bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400',
    amber: 'border-amber-200/60 bg-amber-50/50 hover:bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400',
    violet: 'border-violet-200/60 bg-violet-50/50 hover:bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-400',
  }
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${TONES[tone]}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 dark:bg-white/5">
          {icon}
        </div>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-lg font-bold">{value}</span>
    </button>
  )
}
