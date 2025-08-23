'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from "../../components/Header"
import SeasonSelector from "../../components/SeasonSelector"
import ErrorAlert from "../../components/ErrorAlert"
import LoadingState from "../../components/LoadingState"
import PlayerSearch from "../../components/PlayerSearch"

interface Season {
  id: number
  year: number
  name: string
  is_active: boolean
  is_active_assets: boolean
}

interface Player {
  id: number
  name: string
}

interface ManagerAsset {
  id: number
  manager_id: number
  available_cash: number
  available_slots: number
  managers: {
    manager_name: string
  }
}


export default function Admin() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Start New Season states
  const [startSeasonLoading, setStartSeasonLoading] = useState(false)
  const [startSeasonResult, setStartSeasonResult] = useState<string>('')
  
  // Start Offseason states
  const [startOffseasonLoading, setStartOffseasonLoading] = useState(false)
  const [startOffseasonResult, setStartOffseasonResult] = useState<string>('')
  
  // Player ID Lookup states
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  
  // Create Player states
  const [newPlayerName, setNewPlayerName] = useState('')
  const [creatingPlayer, setCreatingPlayer] = useState(false)
  const [createPlayerResult, setCreatePlayerResult] = useState('')
  
  // Manager Base Assets states
  const [managerAssets, setManagerAssets] = useState<ManagerAsset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [isEditingAssets, setIsEditingAssets] = useState(false)
  const [editValues, setEditValues] = useState<Record<number, { cash: string, slots: string, reason: string }>>({})
  
  

  useEffect(() => {
    async function fetchSeasons() {
      try {
        const response = await fetch('/api/seasons')
        if (!response.ok) throw new Error('Failed to fetch seasons')
        
        const data = await response.json()
        setSeasons(data)
      } catch (error) {
        console.error('Error fetching seasons:', error)
        setError('Failed to load seasons')
      } finally {
        setLoading(false)
      }
    }

    fetchSeasons()
  }, [])


  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player)
    setPlayerSearchQuery(player.name)
  }

  const clearPlayerLookup = () => {
    setSelectedPlayer(null)
    setPlayerSearchQuery('')
  }

  const handleCreatePlayer = async () => {
    if (!newPlayerName.trim()) {
      setCreatePlayerResult('❌ Player name is required')
      return
    }
    
    setCreatingPlayer(true)
    setCreatePlayerResult('')
    
    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim() })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create player')
      }
      
      const newPlayer = await response.json()
      setCreatePlayerResult(`✅ Created player: ${newPlayer.name} (ID: ${newPlayer.id})`)
      setNewPlayerName('')
      
    } catch (error) {
      console.error('Error creating player:', error)
      setCreatePlayerResult(`❌ ${error instanceof Error ? error.message : 'Failed to create player'}`)
    } finally {
      setCreatingPlayer(false)
    }
  }

  const fetchManagerAssets = async () => {
    setAssetsLoading(true)
    try {
      const response = await fetch('/api/admin/manager-base-assets')
      if (!response.ok) throw new Error('Failed to fetch manager assets')
      const data = await response.json()
      
      // Ensure sorting on the client side as well
      const sortedAssets = (data.assets || []).sort((a: ManagerAsset, b: ManagerAsset) => 
        a.managers.manager_name.localeCompare(b.managers.manager_name)
      )
      
      console.log('Sorted assets:', sortedAssets.map(a => a.managers.manager_name))
      setManagerAssets(sortedAssets)
      
      // Initialize edit values with current values
      const initialValues: Record<number, { cash: string, slots: string, reason: string }> = {}
      sortedAssets.forEach((asset: ManagerAsset) => {
        initialValues[asset.manager_id] = {
          cash: asset.available_cash.toString(),
          slots: asset.available_slots.toString(),
          reason: ''
        }
      })
      setEditValues(initialValues)
      setIsEditingAssets(true)
    } catch (error) {
      console.error('Error fetching manager assets:', error)
      setError('Failed to load manager assets')
    } finally {
      setAssetsLoading(false)
    }
  }

  const updateEditValue = (managerId: number, field: 'cash' | 'slots' | 'reason', value: string) => {
    setEditValues(prev => ({
      ...prev,
      [managerId]: {
        ...prev[managerId],
        [field]: value
      }
    }))
  }

  const saveManagerAsset = async (assetId: number, managerId: number) => {
    const values = editValues[managerId]
    if (!values) return
    
    const cash = parseInt(values.cash)
    const slots = parseInt(values.slots)
    
    if (isNaN(cash) || isNaN(slots) || cash < 0 || slots < 0) {
      alert('Please enter valid positive numbers')
      return
    }

    try {
      const response = await fetch('/api/update-manager-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId,
          availableCash: cash,
          availableSlots: slots,
          reason: values.reason
        })
      })

      if (!response.ok) throw new Error('Failed to update manager assets')
      
      // Refresh the data from the API to ensure proper sorting
      const refreshResponse = await fetch('/api/admin/manager-base-assets')
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        setManagerAssets(refreshData.assets || [])
        
        // Update edit values with fresh data
        const updatedValues = { ...editValues }
        refreshData.assets.forEach((asset: ManagerAsset) => {
          updatedValues[asset.manager_id] = {
            cash: asset.available_cash.toString(),
            slots: asset.available_slots.toString(),
            reason: editValues[asset.manager_id]?.reason || ''
          }
        })
        setEditValues(updatedValues)
      }
      
      // Clear the reason field
      updateEditValue(managerId, 'reason', '')
      
      alert('Manager assets updated successfully')
    } catch (error) {
      console.error('Error updating manager assets:', error)
      alert('Failed to update manager assets')
    }
  }

  const handleStartNewSeason = async () => {
    setStartSeasonLoading(true)
    setStartSeasonResult('')

    try {
      const response = await fetch('/api/admin/start-new-season', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // No longer need name/year input
      })

      const data = await response.json()

      if (response.ok) {
        setStartSeasonResult(`✅ ${data.message}`)
        // Refresh seasons list
        const seasonsResponse = await fetch('/api/seasons')
        const seasonsData = await seasonsResponse.json()
        setSeasons(seasonsData)
      } else {
        setStartSeasonResult(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error starting new season:', error)
      setStartSeasonResult('❌ Failed to start new season')
    } finally {
      setStartSeasonLoading(false)
    }
  }

  const handleStartOffseason = async () => {
    setStartOffseasonLoading(true)
    setStartOffseasonResult('')

    try {
      const response = await fetch('/api/admin/start-offseason', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (response.ok) {
        setStartOffseasonResult(`✅ ${data.message}`)
        // Refresh seasons list
        const seasonsResponse = await fetch('/api/seasons')
        const seasonsData = await seasonsResponse.json()
        setSeasons(seasonsData)
      } else {
        setStartOffseasonResult(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error starting offseason:', error)
      setStartOffseasonResult('❌ Failed to start offseason')
    } finally {
      setStartOffseasonLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header />

        <div className="mb-8">
          
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Admin Panel</h2>
          <p className="text-gray-600 mb-6">Administrative tools for managing seasons and league operations</p>
        </div>

        <ErrorAlert error={error} />

        {loading ? (
          <LoadingState message="Loading admin tools..." />
        ) : (
          <div className="space-y-8">
            {/* Start New Season */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-green-200">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Start New Season</h3>
              </div>
              <p className="text-gray-600 mb-4">
                <strong>Automatically advance seasons:</strong> Moves is_active and is_active_assets flags to the next sequential season IDs. All trades are cleared for the new assets season, resetting everyone to $400/3 slots.
              </p>

              <div className="flex items-center space-x-4 mb-4">
                <button
                  onClick={handleStartNewSeason}
                  disabled={startSeasonLoading}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startSeasonLoading ? 'Starting...' : 'Start New Season'}
                </button>
                
                {startSeasonResult && (
                  <div className={`text-sm ${
                    startSeasonResult.includes('✅') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {startSeasonResult}
                  </div>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="text-sm text-green-700">
                  <strong>This will automatically:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Move is_active flag to the next season ID (current playing season)</li>
                    <li>Move is_active_assets flag to the next season ID (current draft/assets season)</li>
                    <li>Reset all manager assets to $400 cash and 3 slots (no trades in new assets season)</li>
                    <li>Clean slate for the new draft year</li>
                  </ul>
                  <div className="mt-2 font-medium text-green-800">
                    ⚠️ Use this button to advance to the next league year, as soon as the draft ends.
                  </div>
                </div>
              </div>
            </div>


            {/* Start Offseason */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-orange-200">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Start Offseason</h3>
              </div>
              <p className="text-gray-600 mb-4">
                <strong>Activate offseason mode:</strong> Marks the current active season as being in offseason, which will enable offseason-specific trade rules and restrictions.
              </p>

              <div className="flex items-center space-x-4 mb-4">
                <button
                  onClick={handleStartOffseason}
                  disabled={startOffseasonLoading}
                  className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startOffseasonLoading ? 'Starting...' : 'Start Offseason'}
                </button>
                
                {startOffseasonResult && (
                  <div className={`text-sm ${
                    startOffseasonResult.includes('✅') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {startOffseasonResult}
                  </div>
                )}
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                <div className="text-sm text-orange-700">
                  <strong>This will:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Set is_offseason = true for the current active season</li>
                    <li>Enable offseason trade rules and restrictions</li>
                    <li>Allow different trading logic during the offseason period</li>
                    <li>Turn off Yahoo API sync (when enabled)</li>
                  </ul>
                  <div className="mt-2 font-medium text-orange-800">
                    ⚠️ Use this when the season ends but before starting a new season.
                  </div>
                </div>
              </div>
            </div>

            {/* Manager Base Assets */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-purple-200">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Manager Base Assets</h3>
              </div>
              <p className="text-gray-600 mb-4">
                <strong>Use this to make adjustments to manager's assets to account for draft day trades, winner bonus ($15), and #chasing790.</strong>
              </p>

              <div className="flex items-center space-x-4 mb-4">
                <button
                  onClick={fetchManagerAssets}
                  disabled={assetsLoading}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assetsLoading ? 'Loading...' : 'Edit Manager Assets'}
                </button>
              </div>

              {managerAssets.length > 0 && isEditingAssets && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Manager
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Base Cash
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Base Slots
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {managerAssets.map((asset) => {
                        const values = editValues[asset.manager_id] || { cash: asset.available_cash.toString(), slots: asset.available_slots.toString(), reason: '' }
                        return (
                          <tr key={asset.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {asset.managers.manager_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <input
                                type="number"
                                value={values.cash}
                                onChange={(e) => updateEditValue(asset.manager_id, 'cash', e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                min="0"
                                step="1"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <input
                                type="number"
                                value={values.slots}
                                onChange={(e) => updateEditValue(asset.manager_id, 'slots', e.target.value)}
                                className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                min="0"
                                step="1"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <input
                                type="text"
                                value={values.reason}
                                onChange={(e) => updateEditValue(asset.manager_id, 'reason', e.target.value)}
                                placeholder="e.g., winner bonus, trade"
                                className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => saveManagerAsset(asset.id, asset.manager_id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Save
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            {/* Yahoo Player Mappings */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-yellow-200">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Yahoo Player Mappings</h3>
              </div>
              <p className="text-gray-600 mb-4">
                <strong>Map Yahoo Fantasy players to UAFBL players</strong> for roster sync integration. This allows the system to match players between Yahoo's API and your internal database.
              </p>

              <div className="flex items-center space-x-4 mb-4">
                <a
                  href="/admin/yahoo-mappings"
                  className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Manage Yahoo Mappings
                </a>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="text-sm text-yellow-700">
                  <strong>Yahoo Integration Features:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Map top fantasy players to UAFBL database</li>
                    <li>Enable daily roster sync from Yahoo during season</li>
                    <li>Support for trade processing and roster updates</li>
                    <li>Handle player name variations and character encoding</li>
                  </ul>
                  <div className="mt-2 font-medium text-yellow-800">
                    💡 Start by mapping the top 25-50 most relevant players for your league.
                  </div>
                </div>
              </div>
            </div>

            {/* Player ID Lookup */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-blue-200">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  5
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Player ID Lookup</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Search for a player to get their database ID for debugging purposes.
              </p>

              <div className="space-y-4">
                <div className="flex items-end space-x-4">
                  <div className="flex-1">
                    <label htmlFor="playerSearch" className="block text-sm font-medium text-gray-700 mb-2">
                      Player Name
                    </label>
                    <PlayerSearch
                      placeholder="Search for player..."
                      onPlayerSelect={handlePlayerSelect}
                      value={playerSearchQuery}
                      onChange={setPlayerSearchQuery}
                      className="w-full"
                    />
                  </div>
                  {selectedPlayer && (
                    <button
                      onClick={clearPlayerLookup}
                      className="px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {selectedPlayer && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-blue-900">{selectedPlayer.name}</h4>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="text-sm text-blue-700">
                            <span className="font-medium">Player ID:</span>
                            <span className="ml-2 font-mono text-lg font-bold text-blue-900">{selectedPlayer.id}</span>
                          </div>
                          <button
                            onClick={() => navigator.clipboard.writeText(selectedPlayer.id.toString())}
                            className="inline-flex items-center px-2 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            📋 Copy ID
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!selectedPlayer && playerSearchQuery && (
                  <div className="text-sm text-gray-500 italic">
                    Select a player from the search results to see their ID
                  </div>
                )}
              </div>
            </div>

            {/* Create Player */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-indigo-200">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  6
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Create Player</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Manually add a new player to the database when they're not found in existing player lists.
              </p>

              <div className="space-y-4">
                <div className="flex items-end space-x-4">
                  <div className="flex-1">
                    <label htmlFor="newPlayerName" className="block text-sm font-medium text-gray-700 mb-2">
                      Player Name
                    </label>
                    <input
                      id="newPlayerName"
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="Enter new player name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                      disabled={creatingPlayer}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleCreatePlayer()
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={handleCreatePlayer}
                    disabled={creatingPlayer || !newPlayerName.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingPlayer ? 'Creating...' : 'Create Player'}
                  </button>
                </div>

                {createPlayerResult && (
                  <div className={`text-sm ${
                    createPlayerResult.includes('✅') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {createPlayerResult}
                  </div>
                )}
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4 mt-4">
                <div className="text-sm text-indigo-700">
                  <strong>Use this when:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Adding rookies or new players not in the database</li>
                    <li>Creating players for manual draft entries</li>
                    <li>Adding international or lesser-known players</li>
                    <li>Fixing missing players during roster imports</li>
                  </ul>
                  <div className="mt-2 font-medium text-indigo-800">
                    💡 The created player will be immediately available for draft picks and rosters.
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}