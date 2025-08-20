'use client'

import { useState, useEffect } from 'react'
import Navigation from "../../components/Navigation"

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="text-lg text-gray-600">Loading LSL data...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">UAFBL</h1>
          
          {/* Navigation Tabs */}
          <Navigation />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Lone Star League</h2>
          <p className="text-sm text-gray-500">
            Total picks: {lslData.length} | 
            Kept: {lslData.filter(r => r.status === 'Kept').length} | 
            Unkept: {lslData.filter(r => r.status === 'Unkept').length}
          </p>
        </div>

        {years.map(year => (
          <div key={year} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{year} LSL Draft</h2>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pick
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        LSL Draft Team
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Draft Team
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupedByYear[year].map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{record.draft_order}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {record.players.name}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.original_managers?.manager_name || 'Unknown'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.draft_managers?.manager_name || 'Unknown'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${record.draft_price}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === 'Kept' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}