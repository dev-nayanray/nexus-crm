'use client'

import { FileText, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface PdfDownloadButtonProps {
  endpoint: string  // e.g. '/api/orders/{id}/invoice'
  filename: string  // e.g. 'invoice-O-2025-00001.pdf'
  label?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
}

export function PdfDownloadButton({
  endpoint,
  filename,
  label = 'Download PDF',
  variant = 'outline',
  size = 'sm',
}: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(endpoint)
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Failed to generate PDF' }))
        throw new Error(e.error ?? 'Failed to generate PDF')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      // Open in new tab for inline viewing
      window.open(url, '_blank')

      // Also trigger download
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('PDF generated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleDownload} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{loading ? 'Generating…' : label}</span>
    </Button>
  )
}
