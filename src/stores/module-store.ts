'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MODULES, type ModuleId } from '@/lib/constants'

type ViewMode = 'list' | 'kanban'

interface ModuleState {
  active: ModuleId
  selectedId: string | null          // selected record in detail drawer
  sidebarOpen: boolean               // mobile sidebar
  viewModes: Partial<Record<ModuleId, ViewMode>>
  set: (m: ModuleId) => void
  select: (id: string | null) => void
  toggleSidebar: () => void
  setSidebar: (open: boolean) => void
  setViewMode: (mode: ViewMode) => void
  getViewMode: () => ViewMode
}

// Safe validation — ensures the persisted module is valid
function isValidModule(m: unknown): m is ModuleId {
  return typeof m === 'string' && (MODULES as readonly string[]).includes(m)
}

export const useModuleStore = create<ModuleState>()(
  persist(
    (set, get) => ({
      active: 'dashboard',
      selectedId: null,
      sidebarOpen: false,
      viewModes: {},
      set: (m) => set({ active: m, selectedId: null }),
      select: (id) => set({ selectedId: id }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebar: (open) => set({ sidebarOpen: open }),
      setViewMode: (mode) => set((s) => ({ viewModes: { ...s.viewModes, [s.active]: mode } })),
      getViewMode: () => get().viewModes[get().active] ?? 'list',
    }),
    {
      name: 'crm-module-store',
      partialize: (s) => ({ active: s.active, viewModes: s.viewModes }),
      // Validate on rehydration — if active is invalid, reset to dashboard
      merge: (persisted, current) => {
        const p = persisted as Partial<ModuleState>
        const safe: ModuleState = { ...current }
        if (p && isValidModule(p.active)) {
          safe.active = p.active
        }
        // Keep default 'dashboard' if invalid
        if (p && typeof p.viewModes === 'object' && p.viewModes !== null) {
          // Filter viewModes to only valid modules
          const safeViewModes: Partial<Record<ModuleId, ViewMode>> = {}
          for (const [k, v] of Object.entries(p.viewModes)) {
            if (isValidModule(k) && (v === 'list' || v === 'kanban')) {
              safeViewModes[k as ModuleId] = v
            }
          }
          safe.viewModes = safeViewModes
        }
        return safe
      },
    }
  )
)
