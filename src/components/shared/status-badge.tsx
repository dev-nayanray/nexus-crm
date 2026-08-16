'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  label: string
  className?: string
  dot?: boolean
}

export function StatusBadge({ label, className, dot = true }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            className?.match(/text-(emerald|sky|amber|violet|rose|slate|orange|zinc)-(\d+)/)?.[0]?.replace('text-', 'bg-') ?? 'bg-current'
          )}
        />
      )}
      {label}
    </span>
  )
}
