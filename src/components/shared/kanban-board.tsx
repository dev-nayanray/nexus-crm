'use client'

import { ReactNode, useState, isValidElement, cloneElement } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

export interface KanbanColumn<T> {
  id: string
  label: string
  color?: string
  items: T[]
}

interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumn<T>[]
  onDrop: (itemId: string, fromColumnId: string, toColumnId: string) => void
  renderCard: (item: T) => ReactNode
  renderDragOverlay?: (item: T) => ReactNode
  emptyColumnLabel?: string
}

export function KanbanBoard<T extends { id: string }>({
  columns,
  onDrop,
  renderCard,
  renderDragOverlay,
  emptyColumnLabel = 'Drop items here',
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const allItems = columns.flatMap((c) => c.items)
  const activeItem = activeId ? allItems.find((i) => i.id === activeId) : null

  function findColumn(itemId: string): KanbanColumn<T> | undefined {
    return columns.find((c) => c.items.some((i) => i.id === itemId))
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const activeItemId = String(active.id)
    const overId = String(over.id)
    const fromCol = findColumn(activeItemId)
    if (!fromCol) return
    // over.id could be a column id (droppable) or another item id
    let toCol: KanbanColumn<T> | undefined
    if (columns.some((c) => c.id === overId)) {
      toCol = columns.find((c) => c.id === overId)
    } else {
      toCol = findColumn(overId)
    }
    if (!toCol) return
    if (fromCol.id === toCol.id) return
    onDrop(activeItemId, fromCol.id, toCol.id)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <KanbanColumnView
            key={col.id}
            column={col}
            emptyLabel={emptyColumnLabel}
            renderCard={renderCard}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeItem
          ? (renderDragOverlay ? renderDragOverlay(activeItem) : renderCard(activeItem))
          : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumnView<T extends { id: string }>({
  column,
  emptyLabel,
  renderCard,
}: {
  column: KanbanColumn<T>
  emptyLabel: string
  renderCard: (item: T) => ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const totalValue = column.items.reduce((sum, _item) => sum, 0)
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-xl border bg-card transition-colors',
        isOver ? 'border-primary border-dashed bg-primary/5' : 'border-border'
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', column.color ?? 'bg-slate-400')} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {column.label}
          </h3>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {column.items.length}
          </span>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ minHeight: 120, maxHeight: 'calc(100vh - 280px)' }}>
        <SortableContext items={column.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {column.items.length === 0 ? (
            <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            column.items.map((item) => {
              const node = renderCard(item)
              if (isValidElement(node)) {
                return cloneElement(node, { key: item.id })
              }
              return node
            })
          )}
        </SortableContext>
      </div>
    </div>
  )
}
