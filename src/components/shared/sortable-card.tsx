'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SortableCardProps {
  id: string
  children: ReactNode
  className?: string
}

export function SortableCard({ id, children, className }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary cursor-grabbing',
        className
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}
