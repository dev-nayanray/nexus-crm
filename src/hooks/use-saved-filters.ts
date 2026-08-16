'use client'

import { useState, useCallback, useMemo } from 'react'

export interface SavedFilter {
  id: string
  name: string
  module: string
  filters: Record<string, string>
  createdAt: string
}

const STORAGE_KEY = 'crm-saved-filters'

function loadFilters(): SavedFilter[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveFilters(filters: SavedFilter[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
}

export function useSavedFilters(module: string) {
  // Load once on first render (client-only). This is fine because
  // the component is mounted inside an authenticated app shell.
  const [allFilters, setAllFilters] = useState<SavedFilter[]>(() => loadFilters())

  const filters = useMemo(() => allFilters.filter((f) => f.module === module), [allFilters, module])

  const saveFilter = useCallback((name: string, currentFilters: Record<string, string>) => {
    const newFilter: SavedFilter = {
      id: `${module}-${Date.now()}`,
      name,
      module,
      filters: currentFilters,
      createdAt: new Date().toISOString(),
    }
    setAllFilters((prev) => {
      const updated = [...prev.filter((f) => !(f.module === module && f.name === name)), newFilter]
      saveFilters(updated)
      return updated
    })
    return newFilter
  }, [module])

  const deleteFilter = useCallback((id: string) => {
    setAllFilters((prev) => {
      const updated = prev.filter((f) => f.id !== id)
      saveFilters(updated)
      return updated
    })
  }, [])

  return { filters, saveFilter, deleteFilter }
}
