'use client'

import { List, LayoutGrid } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useModuleStore } from '@/stores/module-store'
import { cn } from '@/lib/utils'

interface ViewToggleProps {
  className?: string
}

export function ViewToggle({ className }: ViewToggleProps) {
  const viewMode = useModuleStore((s) => s.viewModes[s.active] ?? 'list')
  const setViewMode = useModuleStore((s) => s.setViewMode)
  const active = useModuleStore((s) => s.active)

  // Only show for modules that support kanban
  const supported = ['leads', 'orders', 'quotations', 'follow-ups']
  if (!supported.includes(active)) return null

  return (
    <ToggleGroup
      type="single"
      value={viewMode}
      onValueChange={(v) => v && setViewMode(v as 'list' | 'kanban')}
      className={cn('h-9 rounded-md border border-border bg-card p-0.5', className)}
    >
      <ToggleGroupItem
        value="list"
        aria-label="List view"
        className={cn(
          'h-8 px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
          viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
        )}
      >
        <List className="h-3.5 w-3.5" />
        <span className="ml-1.5 hidden text-xs font-medium sm:inline">List</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="kanban"
        aria-label="Kanban view"
        className={cn(
          'h-8 px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
          viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="ml-1.5 hidden text-xs font-medium sm:inline">Board</span>
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
