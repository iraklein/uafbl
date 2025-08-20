'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Season {
  id: number
  year: number
  name: string
  is_active: boolean
}

interface Player {
  id: number
  name: string
}

interface Trade {
  id: number
  season_id: number
  player_id: number
  notes: string | null
  players: Player
  seasons: Season
}

export default function Admin() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Add Season states
  const [seasonName, setSeasonName] = useState('')
  const [seasonYear, setSeasonYear] = useState('')
  const [makeActive, setMakeActive] = useState(false)
  const [addSeasonLoading, setAddSeasonLoading] = useState(false)
  const [addSeasonResult, setAddSeasonResult] = useState<string>('')
  
  // Initialize Assets states
  const [initializeLoading, setInitializeLoading] = useState(false)
  const [initializeResult, setInitializeResult] = useState<string>('')
  
  // Trades management states
  const [players, setPlayers] = useState<Player[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [tradeNotes, setTradeNotes] = useState('')
  const [addTradeLoading, setAddTradeLoading] = useState(false)
  const [addTradeResult, setAddTradeResult] = useState<string>('')
  const [tradesLoading, setTradesLoading] = useState(false)

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

    async function fetchPlayers() {
      try {
        const response = await fetch('/api/players')
        if (!response.ok) throw new Error('Failed to fetch players')
        
        const data = await response.json()
        setPlayers(data)
      } catch (error) {
        console.error('Error fetching players:', error)
      }
    }

    fetchSeasons()
    fetchPlayers()
  }, [])

  // Fetch trades when season changes
  useEffect(() => {
    if (selectedSeason) {
      fetchTrades()
    }
  }, [selectedSeason])

  const fetchTrades = async () => {
    if (!selectedSeason) return
    
    setTradesLoading(true)
    try {
      const response = await fetch(`/api/admin/trades?season_id=${selectedSeason}`)
      if (!response.ok) throw new Error('Failed to fetch trades')
      
      const data = await response.json()
      setTrades(data)
    } catch (error) {
      console.error('Error fetching trades:', error)
    } finally {
      setTradesLoading(false)
    }
  }

  const handleAddSeason = async () => {
    if (!seasonName.trim() || !seasonYear.trim()) {
      setAddSeasonResult('❌ Please enter both season name and year')
      return
    }

    setAddSeasonLoading(true)
    setAddSeasonResult('')

    try {
      const response = await fetch('/api/admin/add-season', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: seasonName.trim(), 
          year: parseInt(seasonYear),
          isActive: makeActive
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setAddSeasonResult(`✅ ${data.message}`)
        setSeasonName('')
        setSeasonYear('')
        setMakeActive(false)
        // Refresh seasons list
        const seasonsResponse = await fetch('/api/seasons')
        const seasonsData = await seasonsResponse.json()
        setSeasons(seasonsData)
      } else {
        setAddSeasonResult(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error adding season:', error)
      setAddSeasonResult('❌ Failed to add season')
    } finally {
      setAddSeasonLoading(false)
    }
  }

  const handleInitializeSeason = async () => {
    if (!selectedSeason) {
      setInitializeResult('Please select a season first')
      return
    }

    setInitializeLoading(true)
    setInitializeResult('')

    try {
      const response = await fetch('/api/admin/initialize-season', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seasonId: parseInt(selectedSeason) }),
      })

      const data = await response.json()

      if (response.ok) {
        setInitializeResult(`✅ ${data.message}`)
      } else {
        setInitializeResult(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error initializing season:', error)
      setInitializeResult('❌ Failed to initialize season assets')
    } finally {
      setInitializeLoading(false)
    }
  }

  const handleAddTrade = async () => {
    if (!selectedSeason || !selectedPlayer) {
      setAddTradeResult('❌ Please select both season and player')
      return
    }

    setAddTradeLoading(true)
    setAddTradeResult('')

    try {
      const response = await fetch('/api/admin/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          season_id: parseInt(selectedSeason),
          player_id: parseInt(selectedPlayer),
          notes: tradeNotes.trim() || null
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setAddTradeResult(`✅ ${data.message}`)
        setSelectedPlayer('')
        setTradeNotes('')
        // Refresh trades list
        fetchTrades()
      } else {
        setAddTradeResult(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error adding trade:', error)
      setAddTradeResult('❌ Failed to add trade')
    } finally {
      setAddTradeLoading(false)
    }
  }

  const handleDeleteTrade = async (tradeId: number) => {
    if (!confirm('Are you sure you want to delete this trade?')) return

    try {
      const response = await fetch(`/api/admin/trades/${tradeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchTrades() // Refresh list
      } else {
        const data = await response.json()
        alert(`Failed to delete trade: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting trade:', error)
      alert('Failed to delete trade')
    }
  }

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
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
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
                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md"
              >
                Admin
              </Link>
            </nav>
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Admin Panel</h2>
          <p className="text-gray-600 mb-6">Administrative tools for managing seasons and league operations</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="text-lg text-gray-600">Loading admin tools...</div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Step 1: Add New Season */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Add New Season</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Create a new season in the database. Mark as active to make it the current season.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label htmlFor="season-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Season Name:
                  </label>
                  <input
                    id="season-name"
                    type="text"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                    placeholder="e.g., 2025-26 Season"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>
                <div>
                  <label htmlFor="season-year" className="block text-sm font-medium text-gray-700 mb-2">
                    Year:
                  </label>
                  <input
                    id="season-year"
                    type="number"
                    value={seasonYear}
                    onChange={(e) => setSeasonYear(e.target.value)}
                    placeholder="2025"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={makeActive}
                      onChange={(e) => setMakeActive(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Make Active</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={handleAddSeason}
                  disabled={addSeasonLoading}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addSeasonLoading ? 'Adding...' : 'Add Season'}
                </button>
                
                {addSeasonResult && (
                  <div className={`text-sm ${
                    addSeasonResult.includes('✅') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {addSeasonResult}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Initialize Season Assets */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Initialize Season Assets</h3>
              </div>
              <p className="text-gray-600 mb-4">
                After creating a new season, initialize manager assets with $400 cash and 3 slots for all active managers.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="season-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Season:
                  </label>
                  <select
                    id="season-select"
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  >
                    <option value="">Choose a season...</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name} ({season.year}) {season.is_active ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleInitializeSeason}
                    disabled={initializeLoading || !selectedSeason}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {initializeLoading ? 'Initializing...' : 'Initialize Manager Assets'}
                  </button>
                  
                  {initializeResult && (
                    <div className={`text-sm ${
                      initializeResult.includes('✅') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {initializeResult}
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="text-sm text-blue-700">
                    <strong>Note:</strong> This will create new asset records for all active managers with:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>$400 available cash</li>
                      <li>3 available slots</li>
                    </ul>
                    This operation will fail if assets already exist for the selected season.
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Manage Trades */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Manage Trades</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Add trades for players to calculate keeper costs. Each trade adds $5 to the keeper cost.
              </p>
              
              <div className="space-y-6">
                {/* Add Trade Form */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Add New Trade</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label htmlFor="trade-season" className="block text-sm font-medium text-gray-700 mb-2">
                        Season:
                      </label>
                      <select
                        id="trade-season"
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      >
                        <option value="">Choose season...</option>
                        {seasons.map((season) => (
                          <option key={season.id} value={season.id}>
                            {season.name} ({season.year})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="trade-player" className="block text-sm font-medium text-gray-700 mb-2">
                        Player:
                      </label>
                      <select
                        id="trade-player"
                        value={selectedPlayer}
                        onChange={(e) => setSelectedPlayer(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      >
                        <option value="">Choose player...</option>
                        {players
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="trade-notes" className="block text-sm font-medium text-gray-700 mb-2">
                        Notes (optional):
                      </label>
                      <input
                        id="trade-notes"
                        type="text"
                        value={tradeNotes}
                        onChange={(e) => setTradeNotes(e.target.value)}
                        placeholder="Trade details..."
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={handleAddTrade}
                        disabled={addTradeLoading || !selectedSeason || !selectedPlayer}
                        className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addTradeLoading ? 'Adding...' : 'Add Trade'}
                      </button>
                    </div>
                  </div>

                  {addTradeResult && (
                    <div className={`text-sm ${
                      addTradeResult.includes('✅') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {addTradeResult}
                    </div>
                  )}
                </div>

                {/* Trades List */}
                {selectedSeason && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                      Trades for {seasons.find(s => s.id.toString() === selectedSeason)?.name}
                    </h4>
                    
                    {tradesLoading ? (
                      <div className="text-center py-4 text-gray-500">Loading trades...</div>
                    ) : trades.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">No trades found for this season.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Player
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Notes
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {trades.map((trade) => (
                              <tr key={trade.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                  {trade.players.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-700">
                                  {trade.notes || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <button
                                    onClick={() => handleDeleteTrade(trade.id)}
                                    className="text-red-600 hover:text-red-800 font-medium"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {/* Trade count summary */}
                        <div className="mt-4 p-3 bg-blue-50 rounded-md">
                          <div className="text-sm text-blue-700">
                            <strong>Trade Summary:</strong>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                              {Object.entries(
                                trades.reduce((acc, trade) => {
                                  const playerName = trade.players.name
                                  acc[playerName] = (acc[playerName] || 0) + 1
                                  return acc
                                }, {} as Record<string, number>)
                              )
                                .sort(([,a], [,b]) => b - a)
                                .map(([player, count]) => (
                                  <div key={player} className="flex justify-between">
                                    <span>{player}:</span>
                                    <span className="font-medium">{count} trade{count !== 1 ? 's' : ''} (+${count * 5})</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}