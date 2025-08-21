'use client'

import { useState, useEffect } from 'react'
import Header from "../../components/Header"
import SeasonSelector from "../../components/SeasonSelector"
import ErrorAlert from "../../components/ErrorAlert"
import LoadingState from "../../components/LoadingState"
import PlayerSearch from "../../components/PlayerSearch"
import { useSeasons } from "../../hooks/useSeasons"

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


interface GroupedResults {
  [managerName: string]: DraftResult[]
}

interface TopperResult {
  id: number
  managers: Manager
  seasons: Season
  [key: string]: unknown
}

interface LSLResult {
  id: number
  year: number
  original_managers: Manager
  draft_managers: Manager
  [key: string]: unknown
}

interface PlayerHistory {
  player: Player | null
  draft_history: DraftResult[]
  topper_history: TopperResult[]
  lsl_history: LSLResult[]
}

export default function DraftResults() {
  const [activeTab, setActiveTab] = useState<'team' | 'player'>('team')
  const { seasons, selectedSeason, setSelectedSeason, loading: seasonsLoading, error: seasonsError } = useSeasons({
    defaultSeasonFilter: '2024-25'
  })
  const [draftResults, setDraftResults] = useState<DraftResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Player search states
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [playerHistory, setPlayerHistory] = useState<PlayerHistory | null>(null)
  const [playerLoading, setPlayerLoading] = useState(false)
  const [playerError, setPlayerError] = useState('')



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
  const searchPlayerHistory = async (playerName?: string) => {
    const searchQuery = playerName || playerSearchQuery
    if (!searchQuery.trim()) {
      setPlayerError('Please enter a player name')
      return
    }

    setPlayerLoading(true)
    setPlayerError('')

    try {
      const response = await fetch(`/api/player-history?player_name=${encodeURIComponent(searchQuery)}`)
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

  // Handle player selection from search component
  const handlePlayerSelect = (player: Player) => {
    setPlayerSearchQuery(player.name)
    // Auto-search when player is selected
    setTimeout(() => {
      searchPlayerHistory(player.name)
    }, 100)
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
        <Header />

        <ErrorAlert error={seasonsError} />

        <div className="mb-8">
          
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
                <SeasonSelector
                  seasons={seasons}
                  selectedSeason={selectedSeason}
                  onSeasonChange={setSelectedSeason}
                  placeholder="Choose a season..."
                  className="text-sm"
                />
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Player:
              </label>
              <PlayerSearch
                value={playerSearchQuery}
                onChange={setPlayerSearchQuery}
                onPlayerSelect={handlePlayerSelect}
                onExactMatch={handlePlayerSelect}
                placeholder="Enter player name..."
                showSearchButton={true}
                searchButtonText="Search"
                onSearchButtonClick={() => searchPlayerHistory()}
                searchButtonLoading={playerLoading}
              />
            </div>
          )}
        </div>

        {/* Error Messages */}
        {activeTab === 'team' && <ErrorAlert error={error} />}
        {activeTab === 'player' && <ErrorAlert error={playerError} />}

        {/* By Team Tab Content */}
        {activeTab === 'team' && (
          <>
            {loading ? (
              <LoadingState message="Loading draft results..." />
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
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-tight">
                              Price
                            </th>
                            <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-tight">
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
                                  {result.is_keeper && <span className="ml-1 px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs font-bold">K</span>}
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
              <LoadingState message="No draft results found for this season." />
            )}
          </>
        )}

        {/* By Player Tab Content */}
        {activeTab === 'player' && (
          <>
            {playerLoading ? (
              <LoadingState message="Searching player history..." />
            ) : playerHistory ? (
              <div className="space-y-6">
                {playerHistory.player ? (
                  <>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">{playerHistory.player.name}</h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{playerHistory.draft_history.length}</div>
                          <div className="text-sm text-gray-600">Draft Records</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            ${playerHistory.draft_history.reduce((total, record) => total + (record.draft_price || 0), 0)}
                          </div>
                          <div className="text-sm text-gray-600">Total Draft Dollars</div>
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
                  <LoadingState message="No player found with that name." />
                )}
              </div>
            ) : (
              <LoadingState message="Enter a player name to search their history." />
            )}
          </>
        )}
      </div>
    </div>
  )
}