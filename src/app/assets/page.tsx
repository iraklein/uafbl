'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Manager {
  manager_name: string
  active?: boolean
}

interface ManagerAsset {
  id: number
  manager_id: number
  available_cash: number
  available_slots: number
  managers?: Manager
  [key: string]: any // Allow for unknown properties
}

interface Season {
  id: number
  year: number
  name: string
}

export default function Assets() {
  const [assets, setAssets] = useState<ManagerAsset[]>([])
  const [activeSeason, setActiveSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchAssets() {
      try {
        const response = await fetch('/api/manager-assets')
        if (!response.ok) throw new Error('Failed to fetch manager assets')
        
        const data = await response.json()
        console.log('Assets API response:', data) // Debug log
        console.log('Active season from API:', data.activeSeason) // Debug log
        setAssets(data.assets || data) // Handle both new and old format
        setActiveSeason(data.activeSeason || null)
      } catch (error) {
        console.error('Error fetching assets:', error)
        setError('Failed to load manager assets')
      } finally {
        setLoading(false)
      }
    }

    fetchAssets()
  }, [])

  // Calculate totals - handle undefined values
  const totalCash = assets.reduce((sum, asset) => sum + (asset.available_cash || 0), 0)
  const totalSlots = assets.reduce((sum, asset) => sum + (asset.available_slots || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">UAFBL</h1>
            
            {/* Navigation Tabs */}
            <nav className="flex space-x-4">
              <Link 
                href="/rosters"
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Rosters
              </Link>
              <Link 
                href="/draft-results"
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Draft Results
              </Link>
              <Link 
                href="/assets"
                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md"
              >
                Assets
              </Link>
              <Link 
                href="/lsl"
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                LSL
              </Link>
              <Link 
                href="/toppers"
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Toppers
              </Link>
              <Link 
                href="/admin"
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Admin
              </Link>
            </nav>
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Manager Assets for {activeSeason ? activeSeason.name : 'Current Season'}
          </h2>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="text-lg text-gray-600">Loading manager assets...</div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-2xl font-bold text-green-600">${totalCash.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Cash</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-2xl font-bold text-blue-600">{totalSlots}</div>
                <div className="text-sm text-gray-600">Total Slots</div>
              </div>
            </div>

            {/* Assets Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-indigo-600 text-white px-6 py-4">
                <h3 className="text-lg font-semibold">Manager Assets Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Manager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cash
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Slots
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {asset.managers?.manager_name || `Manager ID: ${asset.manager_id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <span className="font-semibold text-green-600">
                            ${(asset.available_cash || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <span className="font-semibold text-blue-600">
                            {asset.available_slots || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {assets.length === 0 && (
              <div className="text-center py-8">
                <div className="text-lg text-gray-600">No manager assets found.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}