'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  trend?: { value: number; positive?: boolean }
  accent?: 'emerald' | 'sky' | 'amber' | 'violet' | 'rose'
}

const ACCENT_STYLES: Record<NonNullable<StatCardProps['accent']>, { bg: string; text: string; glow: string }> = {
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    glow: 'shadow-emerald-500/10',
  },
  sky: {
    bg: 'bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-950/40 dark:to-sky-900/20',
    text: 'text-sky-700 dark:text-sky-400',
    glow: 'shadow-sky-500/10',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
    glow: 'shadow-amber-500/10',
  },
  violet: {
    bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/20',
    text: 'text-violet-700 dark:text-violet-400',
    glow: 'shadow-violet-500/10',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/40 dark:to-rose-900/20',
    text: 'text-rose-700 dark:text-rose-400',
    glow: 'shadow-rose-500/10',
  },
}

export function StatCard({ label, value, icon: Icon, hint, trend, accent = 'emerald' }: StatCardProps) {
  const style = ACCENT_STYLES[accent]
  return (
    <Card className={cn('overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-200', style.glow)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {(hint || trend) && (
              <div className="mt-2.5 flex items-center gap-2 text-xs">
                {trend && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 font-semibold',
                      trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {trend.positive ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(trend.value)}%
                  </span>
                )}
                {hint && <span className="text-muted-foreground">{hint}</span>}
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              style.bg
            )}
          >
            <Icon className={cn('h-5 w-5', style.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
