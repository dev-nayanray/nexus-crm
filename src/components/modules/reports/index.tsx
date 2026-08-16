'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, Users, DollarSign, Target, ShoppingCart } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/stat-card'
import { CardSkeleton } from '@/components/shared/loading-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LEAD_STAGES, ORDER_STATUSES, PAYMENT_METHODS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

const STAGE_COLORS: Record<string, string> = {
  NEW: '#94a3b8', CONTACTED: '#0ea5e9', QUALIFIED: '#8b5cf6', PROPOSAL: '#f59e0b', NEGOTIATION: '#f97316', WON: '#10b981', LOST: '#ef4444',
}

export function ReportsModule() {
  const [range, setRange] = useState('30')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reports', range],
    queryFn: async () => {
      const res = await fetch(`/api/reports?range=${range}`)
      if (!res.ok) throw new Error('Failed to load reports')
      return res.json()
    },
  })

  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <CardSkeleton count={4} />
        <CardSkeleton count={4} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Reports & KPIs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Sales performance, pipeline health, and revenue analytics</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="h-9 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New Leads" value={data.totals.leads} icon={Target} hint={`in last ${range} days`} accent="sky" />
        <StatCard label="New Orders" value={data.totals.orders} icon={ShoppingCart} hint={`in last ${range} days`} accent="violet" />
        <StatCard label="Revenue" value={formatCurrency(data.totals.revenue)} icon={DollarSign} hint={`in last ${range} days`} accent="emerald" />
        <StatCard label="New Customers" value={data.totals.customers} icon={Users} hint={`in last ${range} days`} accent="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue trend */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue — Last 12 Months</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.revenueByMonth} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }} tickFormatter={(m) => { const [y, mo] = m.split('-'); return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('en-US', { month: 'short' }) }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion funnel */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Lead Conversion Funnel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.conversionFunnel} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }} axisLine={false} tickLine={false} width={90} tickFormatter={(s) => LEAD_STAGES[s]?.label ?? s} />
                <Tooltip formatter={(v: number) => [v, 'Leads']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
                  {data.conversionFunnel.map((s: any) => <Cell key={s.stage} fill={STAGE_COLORS[s.stage] ?? '#94a3b8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads by source */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Leads by Source</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.leadsBySource} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={75} label={(e: any) => `${e.source.replace('_', ' ').toLowerCase()}`}>
                  {data.leadsBySource.map((_: any, i: number) => <Cell key={i} fill={['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#f97316', '#94a3b8'][i % 6]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders by status */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Orders by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.ordersByStatus} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 10, fill: 'oklch(0.55 0 0)' }} tickFormatter={(s) => ORDER_STATUSES[s]?.label ?? s} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payments by method */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Payments by Method</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.paymentsByMethod} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="method" tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }} axisLine={false} tickLine={false} width={100} tickFormatter={(m) => m.replace('_', ' ').toLowerCase()} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Amount']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Products by Revenue</CardTitle></CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">No product sales yet</p>
            ) : (
              <div className="space-y-2">
                {data.topProducts.map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-700">#{i + 1}</span>
                      <div>
                        <p className="text-xs font-medium text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.sku} · {p.qty} sold</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
