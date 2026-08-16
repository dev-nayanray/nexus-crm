'use client'

import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

interface ExportButtonProps {
  entity: string  // e.g. 'customers', 'leads'
  filters?: Record<string, string | undefined>
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
  className?: string
  label?: string
}

export function ExportButton({ entity, filters = {}, variant = 'outline', size = 'sm', className, label = 'Export' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  // Hide for reps on users module (they can't access users)
  if (entity === 'users' && user?.role !== 'ADMIN') return null

  async function handleExport() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(filters)) {
        if (v && v !== 'all') params.set(k, v)
      }
      const res = await fetch(`/api/${entity}/export?${params.toString()}`)
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Export failed' }))
        throw new Error(e.error ?? 'Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') ?? `${entity}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported ${entity}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={loading}
      className={className}
      title={`Export ${entity} to CSV`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{loading ? 'Exporting…' : label}</span>
    </Button>
  )
}
