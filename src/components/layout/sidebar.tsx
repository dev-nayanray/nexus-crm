'use client'

import { useMemo } from 'react'
import * as Icons from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_GROUPS, type ModuleId } from '@/lib/constants'
import { useModuleStore } from '@/stores/module-store'
import { useAuth } from '@/hooks/use-auth'
import { canAccess } from '@/lib/permissions'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const active = useModuleStore((s) => s.active)
  const setModule = useModuleStore((s) => s.set)
  const { user } = useAuth()

  const groups = useMemo(() => {
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => canAccess(user?.role, item.id)),
    })).filter((g) => g.items.length > 0)
  }, [user?.role])

  return (
    <aside
      className={cn(
        'flex h-full w-full flex-col bg-sidebar text-sidebar-foreground',
        className
      )}
      data-sidebar="sidebar"
    >
      {/* Brand header — refined */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
          <Icons.Box className="h-5 w-5 text-white" />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-white">Nexus CRM</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/70">B2B Platform</span>
        </div>
      </div>

      {/* Navigation — refined with better active states */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {groups.map((group) => (
            <div key={group.id} className="space-y-0.5">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = (Icons as any)[item.icon] ?? Icons.Circle
                const isActive = active === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setModule(item.id as ModuleId)
                      onNavigate?.()
                    }}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-sidebar-primary/15 text-white'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white'
                    )}
                  >
                    {/* Left accent bar for active state */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-emerald-400" />
                    )}
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive
                          ? 'text-emerald-400'
                          : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80'
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer — user mini-card + version */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/50 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-semibold text-white">
            {user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{user?.name}</p>
            <p className="truncate text-[10px] text-sidebar-foreground/50">{user?.email}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between px-2 text-[10px] text-sidebar-foreground/40">
          <span>v1.0</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        </div>
      </div>
    </aside>
  )
}
