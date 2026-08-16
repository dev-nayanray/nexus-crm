'use client'

import { ReactNode, useMemo, useState } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Inbox, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from './error-state'
import { EmptyState } from './empty-state'
import { cn } from '@/lib/utils'

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T, any>[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  searchKey?: keyof T
  searchPlaceholder?: string
  globalSearch?: string
  toolbar?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  pageSize?: number
  onRowClick?: (row: T) => void
  showSearch?: boolean
  enableSelection?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
}

export function DataTable<T extends { id?: string }>({
  data,
  columns,
  isLoading,
  error,
  onRetry,
  searchKey,
  searchPlaceholder = 'Search…',
  globalSearch,
  toolbar,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your filters or add a new record.',
  emptyAction,
  pageSize = 10,
  onRowClick,
  showSearch = true,
  enableSelection = false,
  selectedIds,
  onSelectionChange,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [internalSearch, setInternalSearch] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const finalSearch = globalSearch ?? internalSearch

  // Selection columns
  const selectionColumn = useMemo<ColumnDef<T, any> | null>(() => {
    if (!enableSelection) return null
    return {
      id: '__select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : false
          }
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value)
            if (onSelectionChange) {
              if (value) {
                onSelectionChange(data.map((d) => d.id!).filter(Boolean))
              } else {
                onSelectionChange([])
              }
            }
          }}
          aria-label="Select all rows on this page"
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value)
            if (onSelectionChange) {
              const id = row.original.id
              if (!id) return
              const current = new Set(selectedIds ?? [])
              if (value) current.add(id)
              else current.delete(id)
              onSelectionChange(Array.from(current))
            }
          }}
          aria-label="Select row"
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 32,
      enableSorting: false,
      enableHiding: false,
    }
  }, [enableSelection, data, onSelectionChange, selectedIds])

  const allColumns = useMemo(() => {
    if (!selectionColumn) return columns
    return [selectionColumn, ...columns]
  }, [columns, selectionColumn])

  const tableColumns = useMemo(() => {
    if (!onRowClick) return allColumns
    return allColumns.map((c) => ({
      ...c,
      meta: { ...(c as any).meta, onRowClick },
    }))
  }, [allColumns, onRowClick])

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, globalFilter: finalSearch, rowSelection },
    enableRowSelection: enableSelection,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: (v) => !globalSearch && setInternalSearch(v),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    globalFilterFn: (row, _columnId, filterValue: string) => {
      if (!filterValue) return true
      const v = filterValue.toLowerCase()
      if (searchKey) {
        const cell = row.original[searchKey]
        return String(cell ?? '').toLowerCase().includes(v)
      }
      return Object.values(row.original as Record<string, unknown>)
        .some((x) => String(x ?? '').toLowerCase().includes(v))
    },
  })

  return (
    <div className="space-y-3">
      {(showSearch || toolbar) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {showSearch ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={finalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => {
                      const sortable = header.column.getCanSort()
                      const sorted = header.column.getIsSorted()
                      return (
                        <th
                          key={header.id}
                          className={cn(
                            'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap',
                            header.id === '__select' && 'w-10 px-3'
                          )}
                          style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                        >
                          {header.isPlaceholder ? null : sortable ? (
                            <button
                              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sorted === 'asc' ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : sorted === 'desc' ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 opacity-20" />
                              )}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border/60">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={allColumns.length} className="px-4 py-2">
                      <EmptyState
                        icon={<Inbox className="h-6 w-6" />}
                        title={emptyTitle}
                        description={emptyDescription}
                        action={emptyAction}
                        className="border-0 bg-transparent py-12"
                      />
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'group transition-colors hover:bg-muted/30',
                        onRowClick && 'cursor-pointer',
                        row.getIsSelected() && 'bg-primary/5'
                      )}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            'px-4 py-3.5 align-middle text-foreground',
                            cell.column.id === '__select' && 'w-10 px-3'
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {table.getState().pagination.pageIndex * pageSize + 1}–
                {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, data.length)} of{' '}
                {data.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <span className="px-2 text-xs font-medium text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
