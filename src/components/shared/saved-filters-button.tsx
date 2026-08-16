'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { useSavedFilters, type SavedFilter } from '@/hooks/use-saved-filters'
import { toast } from 'sonner'

interface SavedFiltersButtonProps {
  module: string
  currentFilters: Record<string, string>
  onApplyFilter: (filters: Record<string, string>) => void
}

export function SavedFiltersButton({ module, currentFilters, onApplyFilter }: SavedFiltersButtonProps) {
  const { filters, saveFilter, deleteFilter } = useSavedFilters(module)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  function handleSave() {
    if (!newName.trim()) {
      toast.error('Enter a filter name')
      return
    }
    setSaving(true)
    saveFilter(newName.trim(), currentFilters)
    setNewName('')
    setSaving(false)
    toast.success(`Filter "${newName.trim()}" saved`)
  }

  function handleApply(filter: SavedFilter) {
    onApplyFilter(filter.filters)
    toast.success(`Applied filter: ${filter.name}`)
  }

  function handleDelete(id: string, name: string) {
    deleteFilter(id)
    toast.success(`Deleted filter: ${name}`)
  }

  const hasActiveFilters = Object.values(currentFilters).some((v) => v && v !== 'all')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {filters.length > 0 ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Filters</span>
          {filters.length > 0 && (
            <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
              {filters.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {filters.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Saved Filters
            </DropdownMenuLabel>
            {filters.map((f) => (
              <DropdownMenuItem key={f.id} className="group flex items-center justify-between gap-2">
                <button
                  onClick={() => handleApply(f)}
                  className="flex-1 text-left text-xs font-medium text-foreground"
                >
                  {f.name}
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    {Object.entries(f.filters).filter(([, v]) => v && v !== 'all').length} filters
                  </span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(f.id, f.name) }}
                  className="opacity-0 group-hover:opacity-100 text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Save Current Filters
        </DropdownMenuLabel>
        <div className="flex gap-1.5 p-2">
          <Input
            placeholder="Filter name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          />
          <Button
            size="sm"
            variant="default"
            onClick={handleSave}
            disabled={saving || !hasActiveFilters}
            className="h-8 shrink-0"
            title={!hasActiveFilters ? 'Set some filters first' : 'Save current filters'}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {!hasActiveFilters && (
          <p className="px-2 pb-2 text-[10px] text-muted-foreground">
            Set some filters above first, then save them here.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
