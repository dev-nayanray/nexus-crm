'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function TableSkeleton({ rows = 8, cols = 5, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      <div className="border-b border-border px-4 py-3">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton key={c} className="h-4" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  )
}
