'use client'

import { useEffect, useState, useCallback } from 'react'
import * as Icons from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useModuleStore } from '@/stores/module-store'
import { NAV_GROUPS, type ModuleId } from '@/lib/constants'
import { useAuth } from '@/hooks/use-auth'
import { canAccess } from '@/lib/permissions'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  LEAD_STAGES, ORDER_STATUSES, QUOTATION_STATUSES, CUSTOMER_STATUSES,
  PRODUCT_STATUSES, ROLES,
} from '@/lib/constants'

interface SearchResult {
  id: string
  type: 'customer' | 'lead' | 'order' | 'quotation' | 'product' | 'user'
  title: string
  subtitle: string
  meta: string
  badge: string
  badgeType: 'status' | 'stage' | 'category' | 'role'
  icon: string
  module: ModuleId
}

const STATUS_CONFIGS: Record<string, Record<string, { label: string; color: string }>> = {
  customer: CUSTOMER_STATUSES,
  lead: LEAD_STAGES,
  order: ORDER_STATUSES,
  quotation: QUOTATION_STATUSES,
  product: PRODUCT_STATUSES,
  user: ROLES as any,
}

const TYPE_LABELS: Record<string, string> = {
  customer: 'Customers',
  lead: 'Leads',
  order: 'Orders',
  quotation: 'Quotations',
  product: 'Products',
  user: 'Users',
}

interface QuickAction {
  id: string
  label: string
  icon: string
  module: ModuleId
  description: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'new-customer', label: 'New Customer', icon: 'UserPlus', module: 'customers', description: 'Add a customer account' },
  { id: 'new-lead', label: 'New Lead', icon: 'Target', module: 'leads', description: 'Add a lead to pipeline' },
  { id: 'new-quotation', label: 'New Quotation', icon: 'FileText', module: 'quotations', description: 'Create a price quote' },
  { id: 'new-order', label: 'New Order', icon: 'ShoppingCart', module: 'orders', description: 'Create a customer order' },
  { id: 'new-followup', label: 'New Follow-up', icon: 'CalendarClock', module: 'follow-ups', description: 'Schedule a task' },
  { id: 'new-product', label: 'New Product', icon: 'Package', module: 'products', description: 'Add a product to catalog' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const setModule = useModuleStore((s) => s.set)
  const select = useModuleStore((s) => s.select)
  const { user } = useAuth()

  // Global keyboard shortcut: Cmd+K (mac) / Ctrl+K (win/linux)
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Reset query when closed (via onOpenChange callback, not useEffect, to avoid cascading renders)
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) setQuery('')
  }, [])

  // Search query
  const { data: searchData, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Search failed')
      return res.json() as Promise<{ results: SearchResult[]; total: number; counts: Record<string, number> }>
    },
    enabled: query.length >= 2 && open,
    staleTime: 10 * 1000,
  })

  const navigateToModule = useCallback((module: ModuleId) => {
    setModule(module)
    setOpen(false)
  }, [setModule])

  const navigateToRecord = useCallback((module: ModuleId, id: string) => {
    setModule(module)
    setTimeout(() => select(id), 50)
    setOpen(false)
  }, [setModule, select])

  // Group results by type
  const groupedResults = (searchData?.results ?? []).reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  // Available modules (filtered by role)
  const availableModules = NAV_GROUPS
    .flatMap((g) => g.items)
    .filter((item) => canAccess(user?.role, item.id))

  const isSearching = query.length >= 2
  const showQuickNav = !isSearching

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:border-border/80 transition-all w-64"
        aria-label="Open command palette"
      >
        <Icons.Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search customers, leads…</span>
        <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="overflow-hidden p-0 shadow-2xl sm:max-w-2xl" showCloseButton={false}>
          <Command className="flex flex-col" loop>
            <CommandInput
              placeholder="Search customers, leads, orders, products… or type an action"
              value={query}
              onValueChange={setQuery}
            />
            {isFetching && (
              <div className="absolute right-12 top-3.5">
                <Icons.Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            )}

            <CommandList className="max-h-[400px]">
              <CommandEmpty>
                {isSearching ? (
                  <div className="py-8 text-center">
                    <Icons.SearchX className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm font-medium text-foreground">No results found</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Try a different search term</p>
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">Start typing to search…</div>
                )}
              </CommandEmpty>

              {/* Search results */}
              {isSearching && searchData && searchData.results.length > 0 && (
                <>
                  {Object.entries(groupedResults).map(([type, items]) => (
                    <CommandGroup key={type} heading={`${TYPE_LABELS[type]} (${items.length})`}>
                      {items.map((r) => {
                        const Icon = (Icons as any)[r.icon] ?? Icons.Circle
                        const statusConfig = STATUS_CONFIGS[r.type]?.[r.badge]
                        return (
                          <CommandItem
                            key={`${r.type}-${r.id}`}
                            value={`${r.type}-${r.title}-${r.subtitle}-${r.meta}`}
                            onSelect={() => navigateToRecord(r.module, r.id)}
                            className="gap-3"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                                {statusConfig && (
                                  <StatusBadge label={statusConfig.label} className={`text-[10px] ${statusConfig.color}`} />
                                )}
                              </div>
                              <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
                            </div>
                            {r.meta && (
                              <span className="shrink-0 text-xs font-medium text-muted-foreground">{r.meta}</span>
                            )}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  ))}
                  {searchData.total > 0 && (
                    <p className="px-3 py-2 text-center text-[10px] text-muted-foreground">
                      {searchData.total} result{searchData.total !== 1 ? 's' : ''} across {Object.keys(groupedResults).length} entities
                    </p>
                  )}
                </>
              )}

              {/* Quick navigation */}
              {showQuickNav && (
                <CommandGroup heading="Navigate to">
                  {availableModules.map((m) => {
                    const Icon = (Icons as any)[m.icon] ?? Icons.Circle
                    return (
                      <CommandItem
                        key={m.id}
                        value={`nav-${m.id}-${m.label}`}
                        onSelect={() => navigateToModule(m.id)}
                        className="gap-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{m.label}</p>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}

              {/* Quick actions */}
              {showQuickNav && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Quick actions">
                    {QUICK_ACTIONS.map((a) => {
                      const Icon = (Icons as any)[a.icon] ?? Icons.Plus
                      return (
                        <CommandItem
                          key={a.id}
                          value={`action-${a.id}-${a.label}`}
                          onSelect={() => navigateToModule(a.module)}
                          className="gap-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{a.label}</p>
                            <p className="text-xs text-muted-foreground">{a.description}</p>
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex h-4 items-center rounded border border-border bg-background px-1 font-mono">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex h-4 items-center rounded border border-border bg-background px-1 font-mono">↵</kbd>
                  select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex h-4 items-center rounded border border-border bg-background px-1 font-mono">esc</kbd>
                  close
                </span>
              </div>
              <span>Nexus CRM Search</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}

