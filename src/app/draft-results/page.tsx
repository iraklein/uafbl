'use client'

import { useState, useEffect } from 'react'
import Header from "../../components/Header"
import SeasonSelector from "../../components/SeasonSelector"
import ErrorAlert from "../../components/ErrorAlert"
import LoadingState from "../../components/LoadingState"
import PlayerSearch from "../../components/PlayerSearch"
import DataTable, { Column } from "../../components/DataTable"
import StatsCard from "../../components/StatsCard"
import ManagerHeader from "../../components/ManagerHeader"
import { useSeasons } from "../../hooks/useSeasons"

interface Player {
  id?: number
  name: string
}

interface Manager {
  manager_name: string
  team_name?: string
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
    defaultSeasonFilter: 'active_playing',
    excludeFutureSeasons: true
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
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8">
        <Header />

        <ErrorAlert error={seasonsError} />

        <div className="mb-6 sm:mb-8">
          
          {/* Tab Navigation with Controls */}
          <div className="space-y-4 mb-6">
            {/* Tab buttons */}
            <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('team')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors tap-target sm:px-6 sm:py-3 sm:text-sm ${
                  activeTab === 'team'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
              >
                By Team
              </button>
              <button
                onClick={() => setActiveTab('player')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors tap-target sm:px-6 sm:py-3 sm:text-sm ${
                  activeTab === 'player'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                }`}
              >
                By Player
              </button>
            </div>

            {/* Season selector & stats OR Player search */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
              {activeTab === 'team' ? (
                <>
                  <div className="flex flex-row space-x-3 sm:space-x-4">
                    <SeasonSelector
                      seasons={seasons}
                      selectedSeason={selectedSeason}
                      onSeasonChange={setSelectedSeason}
                      placeholder="Choose a season..."
                    />
                    
                    {/* Draft records info pill */}
                    {selectedSeason && (
                      <div className="bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg flex-shrink-0">
                        <span className="text-xs font-medium text-blue-900 sm:text-sm">
                          {draftResults.length} total | {draftResults.filter(r => !r.is_keeper).length} drafted | {draftResults.filter(r => r.is_keeper).length} kept
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full sm:w-80">
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
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {managerTotals.map(({ managerName, totalSpent, draftCount, keeperCount, results }) => (
                  <div key={managerName} className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="bg-indigo-600 text-white px-2 py-2 sm:px-3">
                      <div className="flex flex-col">
                        <ManagerHeader
                          managerName={managerName}
                          teamName={results[0]?.managers?.team_name}
                          showLogo={true}
                          logoSize="sm"
                          textSize="sm"
                        />
                        <div className="text-xs mt-1">
                          <span className="mr-2">Total: ${totalSpent}</span>
                          <span className="mr-2">Draft: {draftCount}</span>
                          <span>Keep: {keeperCount}</span>
                        </div>
                      </div>
                    </div>
                    
                    <DataTable<DraftResult>
                      columns={[
                        {
                          key: 'players.name',
                          header: 'Player',
                          render: (_, result) => (
                            <div className="truncate">
                              {result.players.name}
                              {result.is_keeper && <span className="ml-1 px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs font-bold">K</span>}
                              {result.is_topper && <span className="ml-1">🎩</span>}
                            </div>
                          ),
                          className: 'font-medium max-w-0'
                        },
                        {
                          key: 'draft_price',
                          header: 'Price',
                          render: (price) => price ? `$${price}` : 'Free',
                          className: 'text-center',
                          headerClassName: 'text-center'
                        },
                        {
                          key: 'consecutive_keeps',
                          header: 'Kept',
                          render: (keeps) => keeps !== null && keeps !== undefined ? keeps + 1 : '-',
                          className: 'text-center w-16',
                          headerClassName: 'text-center w-16'
                        }
                      ]}
                      data={results}
                      size="sm"
                      className="shadow-none border-0 rounded-t-none"
                    />
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
                    <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                      <h2 className="text-xl font-bold text-gray-900 mb-4 sm:text-2xl">{playerHistory.player.name}</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatsCard
                          title="Draft Records"
                          value={playerHistory.draft_history.length}
                          variant="blue"
                          size="sm"
                        />
                        <StatsCard
                          title="Total Draft Dollars"
                          value={`$${playerHistory.draft_history.reduce((total, record) => total + (record.draft_price || 0), 0)}`}
                          variant="orange"
                          size="sm"
                        />
                        <StatsCard
                          title="Topper Records"
                          value={playerHistory.topper_history.length}
                          variant="green"
                          size="sm"
                        />
                        <StatsCard
                          title="LSL Records"
                          value={playerHistory.lsl_history.length}
                          variant="purple"
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Draft History */}
                    {playerHistory.draft_history.length > 0 && (
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="bg-blue-600 text-white px-4 py-3 sm:px-6 sm:py-4">
                          <h3 className="text-base font-semibold sm:text-lg">Draft History</h3>
                        </div>
                        <DataTable<DraftResult>
                          columns={[
                            {
                              key: 'seasons.name',
                              header: 'Season',
                              render: (_, result) => `${result.seasons.name} (${result.seasons.year})`,
                              className: 'font-medium'
                            },
                            {
                              key: 'managers.manager_name',
                              header: 'Manager',
                              render: (_, result) => (
                                <>
                                  {result.managers.manager_name}
                                  {result.is_topper && <span className="ml-1">🎩</span>}
                                </>
                              )
                            },
                            {
                              key: 'draft_price',
                              header: 'Price',
                              render: (price) => price ? `$${price}` : 'Free'
                            },
                            {
                              key: 'is_keeper',
                              header: 'Type',
                              render: (_, result) => result.is_keeper ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Keeper
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Draft
                                </span>
                              )
                            }
                          ]}
                          data={playerHistory.draft_history}
                          className="shadow-none"
                        />
                      </div>
                    )}

                    {/* Topper History */}
                    {playerHistory.topper_history.length > 0 && (
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="bg-green-600 text-white px-4 py-3 sm:px-6 sm:py-4">
                          <h3 className="text-base font-semibold sm:text-lg">Topper History</h3>
                        </div>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                        <div className="bg-purple-600 text-white px-4 py-3 sm:px-6 sm:py-4">
                          <h3 className="text-base font-semibold sm:text-lg">LSL History</h3>
                        </div>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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