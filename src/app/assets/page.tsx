'use client'

import { useState, useEffect } from 'react'
import Navigation from '../../components/Navigation'

interface Manager {
  manager_name: string
  active?: boolean
}

interface ManagerAsset {
  id: number
  manager_id: number
  available_cash: number
  available_slots: number
  cash_spent: number
  slots_used: number
  cash_left: number
  slots_left: number
  drafted_players: number
  managers?: Manager
  [key: string]: unknown // Allow for unknown properties
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
  const [refreshing, setRefreshing] = useState(false)

  const fetchAssets = async (forceRefresh = false) => {
    try {
      setError('')
      if (forceRefresh) {
        setRefreshing(true)
      }
      
      const url = forceRefresh 
        ? `/api/manager-assets?refresh=true&t=${Date.now()}` 
        : '/api/manager-assets'
      const response = await fetch(url, {
        cache: forceRefresh ? 'no-cache' : 'default',
        headers: forceRefresh ? { 'Cache-Control': 'no-cache' } : {}
      })
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
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [])

  // Calculate totals - handle undefined values
  const totalStartingCash = assets.reduce((sum, asset) => sum + (asset.available_cash || 0), 0)
  const totalStartingSlots = assets.reduce((sum, asset) => sum + (asset.available_slots || 0), 0)
  const totalCashSpent = assets.reduce((sum, asset) => sum + (asset.cash_spent || 0), 0)
  const totalSlotsUsed = assets.reduce((sum, asset) => sum + (asset.slots_used || 0), 0)
  const totalCashLeft = assets.reduce((sum, asset) => sum + (asset.cash_left || 0), 0)
  const totalSlotsLeft = assets.reduce((sum, asset) => sum + (asset.slots_left || 0), 0)
  const totalDraftedPlayers = assets.reduce((sum, asset) => sum + (asset.drafted_players || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">UAFBL</h1>
            
            {/* Navigation Tabs */}
            <Navigation />
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-8">
              <div className="bg-white p-3 rounded-lg shadow text-center">
                <div className="text-lg font-bold text-gray-600">${totalStartingCash.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Starting Cash</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow text-center">
                <div className="text-lg font-bold text-gray-600">{totalStartingSlots}</div>
                <div className="text-xs text-gray-600">Starting Slots</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow text-center">
                <div className="text-lg font-bold text-red-600">${totalCashSpent.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Cash Spent</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow text-center">
                <div className="text-lg font-bold text-red-600">{totalSlotsUsed}</div>
                <div className="text-xs text-gray-600">Slots Used</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow text-center">
                <div className="text-lg font-bold text-green-600">${totalCashLeft.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Cash Left</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow text-center">
                <div className="text-lg font-bold text-green-600">{totalSlotsLeft}</div>
                <div className="text-xs text-gray-600">Slots Left</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow text-center">
                <div className="text-lg font-bold text-purple-600">{totalDraftedPlayers}</div>
                <div className="text-xs text-gray-600">Drafted Players</div>
              </div>
            </div>

            {/* Assets Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Manager Assets Breakdown</h3>
                <button
                  onClick={() => fetchAssets(true)}
                  disabled={refreshing}
                  className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-400 px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    {/* Category Row */}
                    <tr className="border-b border-gray-200">
                      <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-bottom">
                        Manager
                      </th>
                      {/* Starting Group */}
                      <th colSpan={2} className="px-3 py-2 pr-8 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Starting
                      </th>
                      {/* Spent Group */}
                      <th colSpan={2} className="px-3 py-2 pr-8 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Spent
                      </th>
                      {/* Left Group */}
                      <th colSpan={2} className="px-3 py-2 pr-8 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Left
                      </th>
                      {/* Drafted Group */}
                      <th rowSpan={2} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider align-bottom">
                        Drafted
                      </th>
                    </tr>
                    {/* Metric Row */}
                    <tr>
                      {/* Starting Group */}
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cash
                      </th>
                      <th className="px-3 py-2 pr-8 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Slots
                      </th>
                      {/* Spent Group */}
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cash
                      </th>
                      <th className="px-3 py-2 pr-8 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Slots
                      </th>
                      {/* Left Group */}
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cash
                      </th>
                      <th className="px-3 py-2 pr-8 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Slots
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assets.map((asset) => {
                      const isDraftComplete = (asset.drafted_players || 0) >= 14 || (asset.cash_left || 0) <= 0
                      return (
                        <tr key={asset.id} className={`hover:bg-gray-50 ${isDraftComplete ? 'bg-red-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={isDraftComplete ? 'text-red-800 font-bold' : 'text-gray-900'}>
                              {asset.managers?.manager_name || `Manager ID: ${asset.manager_id}`}
                              {isDraftComplete && <span className="ml-2 text-xs bg-red-200 text-red-800 px-2 py-1 rounded">COMPLETE</span>}
                            </span>
                          </td>
                        {/* Starting Group */}
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                          <span className="font-semibold text-gray-600">
                            ${(asset.available_cash || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 pr-8 py-4 whitespace-nowrap text-sm text-center border-r border-gray-200">
                          <span className="font-semibold text-gray-600">
                            {asset.available_slots || 0}
                          </span>
                        </td>
                        {/* Spent Group */}
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                          <span className="font-semibold text-red-600">
                            ${(asset.cash_spent || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 pr-8 py-4 whitespace-nowrap text-sm text-center border-r border-gray-200">
                          <span className="font-semibold text-red-600">
                            {asset.slots_used || 0}
                          </span>
                        </td>
                        {/* Left Group */}
                        <td className={`px-3 py-4 whitespace-nowrap text-sm text-center ${(asset.cash_left || 0) < 0 ? 'bg-red-800' : ''}`}>
                          <span className={`font-semibold ${(asset.cash_left || 0) < 0 ? 'text-white' : 'text-green-600'}`}>
                            ${(asset.cash_left || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className={`px-3 pr-8 py-4 whitespace-nowrap text-sm text-center border-r border-gray-200 ${(asset.slots_left || 0) < 0 ? 'bg-red-800' : ''}`}>
                          <span className={`font-semibold ${(asset.slots_left || 0) < 0 ? 'text-white' : 'text-green-600'}`}>
                            {asset.slots_left || 0}
                          </span>
                        </td>
                        {/* Drafted Group */}
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                          <span className="font-semibold text-purple-600">
                            {asset.drafted_players || 0}
                          </span>
                        </td>
                      </tr>
                      )
                    })}
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