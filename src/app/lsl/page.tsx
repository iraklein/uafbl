'use client'

import { useState, useEffect } from 'react'
import Header from "../../components/Header"
import ErrorAlert from "../../components/ErrorAlert"
import LoadingState from "../../components/LoadingState"
import DataTable, { Column } from "../../components/DataTable"

interface LSLRecord {
  id: number
  draft_order: number
  year: number
  draft_price: number
  status: 'Kept' | 'Unkept'
  player_id: number
  original_manager_id: number
  draft_manager_id: number
  players: {
    name: string
  }
  original_managers: {
    manager_name: string
  } | null
  draft_managers: {
    manager_name: string
  } | null
}

export default function LSLPage() {
  const [lslData, setLSLData] = useState<LSLRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchLSLData() {
      try {
        const response = await fetch('/api/lsl')
        if (!response.ok) throw new Error('Failed to fetch LSL data')
        
        const data = await response.json()
        setLSLData(data)
      } catch (error) {
        console.error('Error fetching LSL data:', error)
        setError('Failed to load LSL data')
      } finally {
        setLoading(false)
      }
    }

    fetchLSLData()
  }, [])

  const groupedByYear = lslData.reduce((acc, record) => {
    if (!acc[record.year]) {
      acc[record.year] = []
    }
    acc[record.year].push(record)
    return acc
  }, {} as Record<number, LSLRecord[]>)

  const years = Object.keys(groupedByYear).map(Number).sort()

  // Define columns for the DataTable
  const columns: Column<LSLRecord>[] = [
    {
      key: 'draft_order',
      header: 'Pick',
      render: (value) => `#${value}`,
      className: 'font-medium text-center w-16',
      headerClassName: 'text-center w-16'
    },
    {
      key: 'players.name',
      header: 'Player',
      className: 'font-medium w-32'
    },
    {
      key: 'original_managers.manager_name',
      header: 'LSL Draft Team',
      render: (value) => value || 'Unknown',
      className: 'w-24'
    },
    {
      key: 'draft_managers.manager_name',
      header: 'Draft Team',
      render: (value) => value || 'Unknown',
      className: 'w-24'
    },
    {
      key: 'draft_price',
      header: 'Price',
      render: (value) => `$${value}`,
      className: 'text-center w-20',
      headerClassName: 'text-center w-20'
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-20',
      headerClassName: 'text-center w-20',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'Kept' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingState message="Loading LSL data..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ErrorAlert error={error} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header />

        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg w-fit">
            <span className="text-sm font-medium text-blue-900">
              {lslData.length} total LSL picks | {lslData.filter(r => r.status === 'Kept').length} kept | {lslData.filter(r => r.status === 'Unkept').length} unkept
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
          {years.map(year => (
            <div key={year} className="min-w-0">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">{year} LSL Draft</h2>
              
              <DataTable
                columns={columns}
                data={groupedByYear[year]}
                emptyMessage={`No LSL data found for ${year}.`}
                size="md"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}