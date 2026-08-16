'use client'

import { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
}

const WIDTHS = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

export function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  icon,
  badge,
  actions,
  children,
  width = 'lg',
}: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn('w-full p-0 sm:max-w-none', WIDTHS[width])}
      >
        {/* Sticky header with gradient + actions */}
        <SheetHeader className="sticky top-0 z-20 border-b border-border bg-gradient-to-b from-card to-muted/30 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {icon && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:text-emerald-400">
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <SheetTitle className="truncate text-base font-bold tracking-tight">{title}</SheetTitle>
                  {badge}
                </div>
                {description && (
                  <SheetDescription className="mt-1 truncate text-xs">
                    {description}
                  </SheetDescription>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex shrink-0 items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Helper sub-components for consistent drawer sections ───────────────────

export function DrawerSection({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function DrawerInfoGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
      {children}
    </div>
  )
}

export function DrawerInfoItem({ label, value, icon }: { label: string; value?: ReactNode; icon?: ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value || '—'}</p>
    </div>
  )
}
