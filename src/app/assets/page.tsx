'use client'

import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import ErrorAlert from '../../components/ErrorAlert'
import LoadingState from '../../components/LoadingState'
import { useAuth } from '../../contexts/AuthContext'

interface Manager {
  manager_name: string
  active?: boolean
}

interface ManagerAsset {
  id: number
  manager_id: number
  available_cash: number
  available_slots: number
  trades_cash?: number
  trades_slots?: number
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
  const { isAdmin } = useAuth()
  const [assets, setAssets] = useState<ManagerAsset[]>([])
  const [, setActiveSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [editingAsset, setEditingAsset] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<{cash: string, slots: string, reason: string}>({cash: '', slots: '', reason: ''})

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

  const startEditing = (assetId: number, currentCash: number, currentSlots: number) => {
    setEditingAsset(assetId)
    setEditValues({
      cash: currentCash.toString(),
      slots: currentSlots.toString(),
      reason: ''
    })
  }

  const cancelEditing = () => {
    setEditingAsset(null)
    setEditValues({cash: '', slots: '', reason: ''})
  }

  const saveEdit = async (assetId: number) => {
    try {
      const response = await fetch('/api/update-manager-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId,
          availableCash: parseInt(editValues.cash),
          availableSlots: parseInt(editValues.slots)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update assets')
      }

      // Refresh the data
      await fetchAssets(true)
      setEditingAsset(null)
      setEditValues({cash: '', slots: '', reason: ''})
    } catch (err) {
      console.error('Error updating assets:', err)
      setError('Failed to update assets')
    }
  }

  // Calculate totals - handle undefined values
  const totalPreDraftCash = assets.reduce((sum, asset) => sum + (asset.available_cash || 0), 0)
  const totalPreDraftSlots = assets.reduce((sum, asset) => sum + (asset.available_slots || 0), 0)
  const totalCashSpent = assets.reduce((sum, asset) => sum + (asset.cash_spent || 0), 0)
  const totalSlotsUsed = assets.reduce((sum, asset) => sum + (asset.slots_used || 0), 0)
  const totalCashRemaining = assets.reduce((sum, asset) => sum + ((asset.available_cash || 0) - (asset.cash_spent || 0)), 0)
  const totalSlotsRemaining = assets.reduce((sum, asset) => sum + ((asset.available_slots || 0) - (asset.slots_used || 0)), 0)
  const totalDraftedPlayers = assets.reduce((sum, asset) => sum + (asset.drafted_players || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8">
        <Header />


        <ErrorAlert error={error} />

        {loading ? (
          <LoadingState message="Loading manager assets..." />
        ) : (
          <>

            {/* Assets Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Manager Assets - {totalDraftedPlayers} Drafted Players</h3>
                <button
                  onClick={() => fetchAssets(true)}
                  disabled={refreshing}
                  className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-400 px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{tableLayout: 'fixed'}}>
                  <colgroup>
                    <col style={{width: '180px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                  </colgroup>
                  <thead className="bg-gray-50">
                    {/* Category Row */}
                    <tr className="border-b border-gray-200">
                      <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-bottom">
                        Manager
                      </th>
                      {/* Trades Group */}
                      <th colSpan={2} className="px-3 py-2 pr-8 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Trades
                      </th>
                      {/* Pre-Draft Group */}
                      <th colSpan={2} className="px-3 py-2 pr-8 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Pre-Draft
                      </th>
                      {/* Spent Group */}
                      <th colSpan={2} className="px-3 py-2 pr-8 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Spent
                      </th>
                      {/* Remaining Group */}
                      <th colSpan={2} className="px-3 py-2 pr-8 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Remaining
                      </th>
                      {/* Drafted Group */}
                      <th rowSpan={2} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider align-bottom">
                        Drafted
                      </th>
                    </tr>
                    {/* Metric Row */}
                    <tr>
                      {/* Trades Group */}
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cash
                      </th>
                      <th className="px-3 py-2 pr-8 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Slots
                      </th>
                      {/* Pre-Draft Group */}
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
                      {/* Remaining Group */}
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cash
                      </th>
                      <th className="px-3 py-2 pr-8 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Slots
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assets
                      .sort((a, b) => (a.managers?.manager_name || '').localeCompare(b.managers?.manager_name || ''))
                      .map((asset) => {
                      const isDraftComplete = (asset.drafted_players || 0) >= 14 || (asset.cash_left || 0) <= 0
                      return (
                        <tr key={asset.id} className={`hover:bg-gray-50 ${isDraftComplete ? 'bg-red-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={isDraftComplete ? 'text-red-800 font-bold' : 'text-gray-900'}>
                              {asset.managers?.manager_name || `Manager ID: ${asset.manager_id}`}
                              {isDraftComplete && <span className="ml-2 text-xs bg-red-200 text-red-800 px-2 py-1 rounded">COMPLETE</span>}
                            </span>
                          </td>
                        {/* Trades Group */}
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                          <span className={`font-semibold ${(asset.trades_cash || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(asset.trades_cash || 0) >= 0 ? '+' : ''}${(asset.trades_cash || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 pr-8 py-4 whitespace-nowrap text-sm text-center border-r border-gray-200">
                          <span className={`font-semibold ${(asset.trades_slots || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(asset.trades_slots || 0) >= 0 ? '+' : ''}{asset.trades_slots || 0}
                          </span>
                        </td>
                        {/* Pre-Draft Group */}
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                          {isAdmin && editingAsset === asset.id ? (
                            <input
                              type="number"
                              value={editValues.cash}
                              onChange={(e) => setEditValues({...editValues, cash: e.target.value})}
                              className="w-20 px-2 py-1 text-center border border-gray-300 rounded text-gray-600 font-semibold"
                              min="0"
                            />
                          ) : (
                            <span className="font-semibold text-gray-600">
                              ${(asset.available_cash || 0).toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="px-3 pr-8 py-4 whitespace-nowrap text-sm text-center border-r border-gray-200">
                          {isAdmin && editingAsset === asset.id ? (
                            <div className="flex items-center justify-center space-x-2">
                              <input
                                type="number"
                                value={editValues.slots}
                                onChange={(e) => setEditValues({...editValues, slots: e.target.value})}
                                className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-gray-600 font-semibold"
                                min="0"
                              />
                              <button
                                onClick={() => saveEdit(asset.id)}
                                className="text-green-600 hover:text-green-800 text-xs px-2 py-1 bg-green-100 rounded"
                              >
                                ✓
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-red-600 hover:text-red-800 text-xs px-2 py-1 bg-red-100 rounded"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span className="font-semibold text-gray-600">
                              {asset.available_slots || 0}
                            </span>
                          )}
                        </td>
                        {/* Spent Group */}
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                          <span className="font-semibold text-orange-600">
                            ${(asset.cash_spent || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 pr-8 py-4 whitespace-nowrap text-sm text-center border-r border-gray-200">
                          <span className="font-semibold text-orange-600">
                            {asset.slots_used || 0}
                          </span>
                        </td>
                        {/* Remaining Group */}
                        <td className={`px-3 py-4 whitespace-nowrap text-sm text-center ${((asset.available_cash || 0) - (asset.cash_spent || 0)) < 0 ? 'bg-red-800' : ''}`}>
                          <span className={`font-semibold ${((asset.available_cash || 0) - (asset.cash_spent || 0)) < 0 ? 'text-white' : 'text-blue-600'}`}>
                            ${((asset.available_cash || 0) - (asset.cash_spent || 0)).toLocaleString()}
                          </span>
                        </td>
                        <td className={`px-3 pr-8 py-4 whitespace-nowrap text-sm text-center border-r border-gray-200 ${((asset.available_slots || 0) - (asset.slots_used || 0)) < 0 ? 'bg-red-800' : ''}`}>
                          <span className={`font-semibold ${((asset.available_slots || 0) - (asset.slots_used || 0)) < 0 ? 'text-white' : 'text-blue-600'}`}>
                            {(asset.available_slots || 0) - (asset.slots_used || 0)}
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

            {/* Sticky Totals Bar */}
            <div className="sticky bottom-0 bg-gray-100 border-t-2 border-gray-300 shadow-lg z-10">
              <div className="overflow-x-auto">
                <table className="w-full" style={{tableLayout: 'fixed'}}>
                  <colgroup>
                    <col style={{width: '180px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                    <col style={{width: '80px'}} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        TOTALS
                      </td>
                      {/* Trades Group */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-bold">
                        <span className={`${assets.reduce((sum, asset) => sum + (asset.trades_cash || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {assets.reduce((sum, asset) => sum + (asset.trades_cash || 0), 0) >= 0 ? '+' : ''}${assets.reduce((sum, asset) => sum + (asset.trades_cash || 0), 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 pr-8 py-4 whitespace-nowrap text-sm text-center border-r border-gray-200 font-bold">
                        <span className={`${assets.reduce((sum, asset) => sum + (asset.trades_slots || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {assets.reduce((sum, asset) => sum + (asset.trades_slots || 0), 0) >= 0 ? '+' : ''}{assets.reduce((sum, asset) => sum + (asset.trades_slots || 0), 0)}
                        </span>
                      </td>
                      {/* Pre-Draft Group */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-600">
                        ${totalPreDraftCash.toLocaleString()}
                      </td>
                      <td className="px-3 pr-8 py-4 whitespace-nowrap text-sm text-center border-r border-gray-200 font-bold text-gray-600">
                        {totalPreDraftSlots}
                      </td>
                      {/* Spent Group */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-bold text-orange-600">
                        ${totalCashSpent.toLocaleString()}
                      </td>
                      <td className="px-3 pr-8 py-4 whitespace-nowrap text-sm text-center border-r border-gray-200 font-bold text-orange-600">
                        {totalSlotsUsed}
                      </td>
                      {/* Remaining Group */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-bold text-blue-600">
                        ${totalCashRemaining.toLocaleString()}
                      </td>
                      <td className="px-3 pr-8 py-4 whitespace-nowrap text-sm text-center border-r border-gray-200 font-bold text-blue-600">
                        {totalSlotsRemaining}
                      </td>
                      {/* Drafted Group */}
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-bold text-purple-600">
                        {totalDraftedPlayers}
                      </td>
                    </tr>
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