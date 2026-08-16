import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null) return '—'
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', BDT: '৳', INR: '₹', AED: 'AED ',
  }
  const sym = symbols[currency] ?? ''
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US')
}

export function formatDate(date: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', opts ?? { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(d)
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return '0s'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export function initials(name?: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function truncate(text: string | null | undefined, len = 60): string {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '…' : text
}

// Generate sequential numbers for entities (e.g., Q-2024-001)
export function generateNumber(prefix: string, count: number, year = new Date().getFullYear()): string {
  return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`
}

// Build a query string from filter object
export function buildQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '' && v !== 'all') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}
