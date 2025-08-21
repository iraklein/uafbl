import { ReactNode } from 'react'

export interface Column<T = any> {
  key: string
  header: string
  className?: string
  headerClassName?: string
  render?: (value: any, row: T, index: number) => ReactNode
  sortable?: boolean
}

interface DataTableProps<T = any> {
  columns: Column<T>[]
  data: T[]
  className?: string
  emptyMessage?: string
  emptyComponent?: ReactNode
  onRowClick?: (row: T, index: number) => void
  rowClassName?: string | ((row: T, index: number) => string)
  headerClassName?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function DataTable<T = any>({
  columns,
  data,
  className = '',
  emptyMessage = 'No data available',
  emptyComponent,
  onRowClick,
  rowClassName = '',
  headerClassName = 'bg-gray-50',
  size = 'md'
}: DataTableProps<T>) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm', 
    lg: 'text-base'
  }

  const paddingClasses = {
    sm: 'px-2 py-1',
    md: 'px-4 py-3',
    lg: 'px-6 py-4'
  }

  const getValue = (row: T, key: string): any => {
    return key.split('.').reduce((obj: any, k: string) => obj?.[k], row)
  }

  const getRowClassName = (row: T, index: number): string => {
    const baseClass = onRowClick ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50'
    if (typeof rowClassName === 'function') {
      return `${baseClass} ${rowClassName(row, index)}`
    }
    return `${baseClass} ${rowClassName}`
  }

  if (data.length === 0) {
    if (emptyComponent) {
      return <>{emptyComponent}</>
    }
    return (
      <div className="text-center py-8">
        <div className="text-lg text-gray-600">{emptyMessage}</div>
      </div>
    )
  }

  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={headerClassName}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${paddingClasses[size]} text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.headerClassName || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr
                key={index}
                className={getRowClassName(row, index)}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              >
                {columns.map((column) => {
                  const value = getValue(row, column.key)
                  const cellContent = column.render 
                    ? column.render(value, row, index)
                    : value

                  return (
                    <td
                      key={column.key}
                      className={`${paddingClasses[size]} whitespace-nowrap ${sizeClasses[size]} text-gray-900 ${column.className || ''}`}
                    >
                      {cellContent}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}