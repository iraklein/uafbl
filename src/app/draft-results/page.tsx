'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Player {
  id?: number
  name: string
}

interface Manager {
  manager_name: string
  active?: boolean
}

interface Season {
  year: number
  name: string
}

interface DraftResult {
  id: number
  draft_price: number | null
  is_keeper: boolean
  is_topper: boolean
  consecutive_keeps: number | null
  players: Player
  managers: Manager
  seasons: Season
}

interface SeasonOption {
  id: number
  year: number
  name: string
}

interface GroupedResults {
  [managerName: string]: DraftResult[]
}

interface TopperResult {
  id: number
  managers: Manager
  seasons: Season
  [key: string]: any
}

interface LSLResult {
  id: number
  year: number
  original_managers: Manager
  draft_managers: Manager
  [key: string]: any
}

interface PlayerHistory {
  player: Player | null
  draft_history: DraftResult[]
  topper_history: TopperResult[]
  lsl_history: LSLResult[]
}

export default function DraftResults() {
  const [activeTab, setActiveTab] = useState<'team' | 'player'>('team')
  const [seasons, setSeasons] = useState<SeasonOption[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [draftResults, setDraftResults] = useState<DraftResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Player search states
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [playerHistory, setPlayerHistory] = useState<PlayerHistory | null>(null)
  const [playerLoading, setPlayerLoading] = useState(false)
  const [playerError, setPlayerError] = useState('')
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])

  // Fetch seasons for dropdown
  useEffect(() => {
    async function fetchSeasons() {
      try {
        const response = await fetch('/api/seasons')
        if (!response.ok) throw new Error('Failed to fetch seasons')
        
        const data = await response.json()
        setSeasons(data)
        
        // Find the season with data, preferring 2024-25 or the most recent with data
        if (data.length > 0) {
          // Look for 2024-25 season first
          const season2024_25 = data.find((season: SeasonOption) => season.name.includes('2024-25') || season.year === 2024)
          if (season2024_25) {
            setSelectedSeason(season2024_25.id.toString())
          } else {
            // Fall back to the most recent season
            setSelectedSeason(data[0].id.toString())
          }
        }
      } catch (error: unknown) {
        console.error('Error fetching seasons:', error)
        setError('Failed to load seasons')
      }
    }

    fetchSeasons()
  }, [])

  // Fetch all players for autocomplete
  useEffect(() => {
    async function fetchPlayers() {
      try {
        const response = await fetch('/api/players')
        if (!response.ok) throw new Error('Failed to fetch players')
        
        const data = await response.json()
        setAllPlayers(data)
      } catch (error: unknown) {
        console.error('Error fetching players:', error)
      }
    }

    fetchPlayers()
  }, [])

  // Fetch draft results when season changes
  useEffect(() => {
    if (!selectedSeason) return

    async function fetchDraftResults() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/draft-results?season_id=${selectedSeason}`)
        if (!response.ok) throw new Error('Failed to fetch draft results')
        
        const data = await response.json()
        setDraftResults(data)
      } catch (error: unknown) {
        console.error('Error fetching draft results:', error)
        setError('Failed to load draft results')
      } finally {
        setLoading(false)
      }
    }

    fetchDraftResults()
  }, [selectedSeason])

  // Search for player history
  const searchPlayerHistory = async () => {
    if (!playerSearchQuery.trim()) {
      setPlayerError('Please enter a player name')
      return
    }

    setPlayerLoading(true)
    setPlayerError('')

    try {
      const response = await fetch(`/api/player-history?player_name=${encodeURIComponent(playerSearchQuery)}`)
      if (!response.ok) throw new Error('Failed to fetch player history')
      
      const data = await response.json()
      setPlayerHistory(data)
    } catch (error: unknown) {
      console.error('Error fetching player history:', error)
      setPlayerError('Failed to load player history')
    } finally {
      setPlayerLoading(false)
    }
  }

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchPlayerHistory()
      setShowSuggestions(false)
    }
  }

  // Handle player search input change
  const handlePlayerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setPlayerSearchQuery(query)
    
    if (query.trim().length > 0) {
      const filtered = allPlayers.filter(player => 
        player.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10) // Limit to 10 suggestions
      setFilteredPlayers(filtered)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
      setFilteredPlayers([])
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (playerName: string) => {
    setPlayerSearchQuery(playerName)
    setShowSuggestions(false)
    // Auto-search when suggestion is clicked
    setTimeout(() => {
      searchPlayerHistory()
    }, 100)
  }

  // Handle input blur
  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false)
    }, 150)
  }

  // Group results by manager
  const groupedResults: GroupedResults = draftResults.reduce((acc, result) => {
    const managerName = result.managers.manager_name
    if (!acc[managerName]) {
      acc[managerName] = []
    }
    acc[managerName].push(result)
    return acc
  }, {} as GroupedResults)

  // Calculate totals for each manager
  const managerTotals = Object.entries(groupedResults).map(([managerName, results]) => {
    const totalSpent = results.reduce((sum, result) => sum + (result.draft_price || 0), 0)
    const draftCount = results.filter(r => !r.is_keeper).length
    const keeperCount = results.filter(r => r.is_keeper).length
    
    return {
      managerName,
      totalSpent,
      draftCount,
      keeperCount,
      results: results.sort((a, b) => (b.draft_price || 0) - (a.draft_price || 0))
    }
  }).sort((a, b) => a.managerName.localeCompare(b.managerName))

  const selectedSeasonName = seasons.find(s => s.id.toString() === selectedSeason)?.name || ''

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
                href="/assets"
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Assets
              </Link>
              <Link 
                href="/trades"
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Trades
              </Link>
              <Link 
                href="/draft-results"
                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md"
              >
                Draft Results
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
          
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Draft Results</h2>
          
          {/* Tab Navigation */}
          <div className="flex space-x-2 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('team')}
              className={`px-6 py-3 text-sm font-semibold rounded-md transition-colors ${
                activeTab === 'team'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
              }`}
            >
              By Team
            </button>
            <button
              onClick={() => setActiveTab('player')}
              className={`px-6 py-3 text-sm font-semibold rounded-md transition-colors ${
                activeTab === 'player'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
              }`}
            >
              By Player
            </button>
          </div>

          {activeTab === 'team' && (
            <>
              <div className="mb-6">
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
                      {season.name} ({season.year})
                    </option>
                  ))}
                </select>
              </div>

              {selectedSeasonName && (
                <div className="bg-white p-4 rounded-lg shadow mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">{selectedSeasonName}</h2>
                  <p className="text-gray-600">
                    {draftResults.length} total draft records | {draftResults.filter(r => !r.is_keeper).length} drafted | {draftResults.filter(r => r.is_keeper).length} kept
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'player' && (
            <div className="mb-6">
              <label htmlFor="player-search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Player:
              </label>
              <div className="relative">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      id="player-search"
                      type="text"
                      value={playerSearchQuery}
                      onChange={handlePlayerSearchChange}
                      onKeyPress={handleSearchKeyPress}
                      onBlur={handleInputBlur}
                      onFocus={() => {
                        if (playerSearchQuery.trim().length > 0) {
                          setShowSuggestions(true)
                        }
                      }}
                      placeholder="Enter player name..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      autoComplete="off"
                    />
                    
                    {/* Autocomplete Dropdown */}
                    {showSuggestions && filteredPlayers.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                        {filteredPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => handleSuggestionClick(player.name)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                          >
                            {player.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={searchPlayerHistory}
                    disabled={playerLoading}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {playerLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Messages */}
        {error && activeTab === 'team' && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {playerError && activeTab === 'player' && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {playerError}
          </div>
        )}

        {/* By Team Tab Content */}
        {activeTab === 'team' && (
          <>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-lg text-gray-600">Loading draft results...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {managerTotals.map(({ managerName, totalSpent, draftCount, keeperCount, results }) => (
                  <div key={managerName} className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="bg-indigo-600 text-white px-3 py-2">
                      <div className="flex flex-col">
                        <h3 className="text-sm font-semibold">{managerName}</h3>
                        <div className="text-xs mt-1">
                          <span className="mr-2">Total: ${totalSpent}</span>
                          <span className="mr-2">Draft: {draftCount}</span>
                          <span>Keep: {keeperCount}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-tight">
                              Player
                            </th>
                            <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-tight">
                              Price
                            </th>
                            <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-tight">
                              Kept
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {results.map((result) => (
                            <tr key={result.id} className="hover:bg-gray-50">
                              <td className="px-2 py-1 text-xs font-medium text-gray-900 truncate max-w-0">
                                <div className="truncate">
                                  {result.players.name}
                                  {result.is_topper && <span className="ml-1">🎩</span>}
                                </div>
                              </td>
                              <td className="px-1 py-1 text-xs text-gray-700 text-center">
                                {result.draft_price ? `$${result.draft_price}` : 'Free'}
                              </td>
                              <td className="px-1 py-1 text-xs text-gray-700 text-center">
                                {result.consecutive_keeps !== null && result.consecutive_keeps !== undefined ? result.consecutive_keeps + 1 : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && draftResults.length === 0 && selectedSeason && (
              <div className="text-center py-8">
                <div className="text-lg text-gray-600">No draft results found for this season.</div>
              </div>
            )}
          </>
        )}

        {/* By Player Tab Content */}
        {activeTab === 'player' && (
          <>
            {playerLoading ? (
              <div className="text-center py-8">
                <div className="text-lg text-gray-600">Searching player history...</div>
              </div>
            ) : playerHistory ? (
              <div className="space-y-6">
                {playerHistory.player ? (
                  <>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">{playerHistory.player.name}</h2>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{playerHistory.draft_history.length}</div>
                          <div className="text-sm text-gray-600">Draft Records</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{playerHistory.topper_history.length}</div>
                          <div className="text-sm text-gray-600">Topper Records</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{playerHistory.lsl_history.length}</div>
                          <div className="text-sm text-gray-600">LSL Records</div>
                        </div>
                      </div>
                    </div>

                    {/* Draft History */}
                    {playerHistory.draft_history.length > 0 && (
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="bg-blue-600 text-white px-6 py-4">
                          <h3 className="text-lg font-semibold">Draft History</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Season
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Manager
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Price
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Type
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {playerHistory.draft_history.map((result) => (
                                <tr key={result.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {result.seasons.name} ({result.seasons.year})
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {result.managers.manager_name}
                                    {result.is_topper && <span className="ml-1">🎩</span>}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {result.draft_price ? `$${result.draft_price}` : 'Free'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {result.is_keeper ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Keeper
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Draft
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Topper History */}
                    {playerHistory.topper_history.length > 0 && (
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="bg-green-600 text-white px-6 py-4">
                          <h3 className="text-lg font-semibold">Topper History</h3>
                        </div>
                        <div className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {playerHistory.topper_history.map((result) => (
                              <div key={result.id} className="p-3 rounded border bg-green-50 border-green-200">
                                <div className="font-medium text-gray-900">{result.seasons.name} ({result.seasons.year})</div>
                                <div className="text-sm text-gray-600">Manager: {result.managers.manager_name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LSL History */}
                    {playerHistory.lsl_history.length > 0 && (
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="bg-purple-600 text-white px-6 py-4">
                          <h3 className="text-lg font-semibold">LSL History</h3>
                        </div>
                        <div className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {playerHistory.lsl_history.map((result) => (
                              <div key={result.id} className="p-3 rounded border bg-purple-50 border-purple-200">
                                <div className="font-medium text-gray-900">Year: {result.year}</div>
                                <div className="text-sm text-gray-600">Original: {result.original_managers.manager_name}</div>
                                <div className="text-sm text-gray-600">Drafted by: {result.draft_managers.manager_name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-lg text-gray-600">No player found with that name.</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-lg text-gray-600">Enter a player name to search their history.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}