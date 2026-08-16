'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings as SettingsIcon, Building2, DollarSign, ShoppingCart, Warehouse, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { CURRENCIES } from '@/lib/constants'

const SECTIONS = [
  { id: 'company', label: 'Company', icon: Building2, fields: [
    { key: 'company.name', label: 'Company name', type: 'text' },
    { key: 'company.email', label: 'Contact email', type: 'email' },
    { key: 'company.address', label: 'Address', type: 'textarea' },
  ]},
  { id: 'finance', label: 'Finance', icon: DollarSign, fields: [
    { key: 'currency.default', label: 'Default currency', type: 'select', options: CURRENCIES },
    { key: 'tax.default', label: 'Default tax rate (%)', type: 'number' },
    { key: 'payment.prefix', label: 'Payment number prefix', type: 'text' },
  ]},
  { id: 'sales', label: 'Sales', icon: ShoppingCart, fields: [
    { key: 'quotation.validDays', label: 'Quotation valid days', type: 'number' },
    { key: 'quotation.prefix', label: 'Quotation number prefix', type: 'text' },
    { key: 'order.prefix', label: 'Order number prefix', type: 'text' },
  ]},
  { id: 'inventory', label: 'Inventory', icon: Warehouse, fields: [
    { key: 'inventory.reorderLevel', label: 'Default reorder level', type: 'number' },
  ]},
]

export function SettingsModule() {
  const qc = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      return res.json()
    },
  })

  if (data && !loaded) {
    setValues(data)
    setLoaded(true)
  }

  function set(k: string, v: string) { setValues((s) => ({ ...s, [k]: v })) }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Settings saved')
      qc.invalidateQueries({ queryKey: ['settings'] })
    } catch (e) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage your CRM configuration and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/50" />)}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4 text-emerald-600" />
                    {section.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.fields.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">{f.label}</Label>
                      {f.type === 'textarea' ? (
                        <Textarea rows={2} value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                      ) : f.type === 'select' ? (
                        <Select value={values[f.key] ?? ''} onValueChange={(v) => set(f.key, v)}>
                          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                          <SelectContent>
                            {f.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input type={f.type} value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Product</p><p className="mt-0.5 font-medium text-foreground">Nexus CRM</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Version</p><p className="mt-0.5 font-medium text-foreground">1.0.0</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Stack</p><p className="mt-0.5 font-medium text-foreground">Next.js 16 · Prisma</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plan</p><p className="mt-0.5 font-medium text-foreground">Free tier</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
