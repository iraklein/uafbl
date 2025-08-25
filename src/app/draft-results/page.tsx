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
  yahoo_image_url?: string | null
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
  is_bottom: boolean
  bottom_manager_id: number | null
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
  draftHistory: DraftResult[]
  topperHistory: TopperResult[]
  lslHistory: LSLResult[]
  managersMap?: Record<number, { manager_name: string; team_name?: string }>
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
    <div className="min-h-screen bg-gray-50 py-4 sm:pb-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8">
        <Header />

        <ErrorAlert error={seasonsError} />

        <div className="mb-6 sm:mb-8">
          
          {/* Tab Navigation with Controls */}
          <div className="mb-6">
            {/* Row 1: Tabs and Season selector */}
            <div className="flex flex-row space-x-3 sm:space-x-4 items-center mb-4">
              {/* Left side: Tab buttons */}
              <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit flex-shrink-0">
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

              {/* Right side: Season selector OR Player search */}
              <div className="flex flex-row space-x-2 sm:space-x-3 items-center min-w-0 flex-1">
                {activeTab === 'team' ? (
                  <SeasonSelector
                    seasons={seasons}
                    selectedSeason={selectedSeason}
                    onSeasonChange={setSelectedSeason}
                    loading={seasonsLoading}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-xs sm:text-sm w-22 sm:w-26"
                  />
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

            {/* Row 2: Stats pill (only for team tab) */}
            {activeTab === 'team' && selectedSeason && (
              <div className="bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg w-fit">
                <span className="text-xs font-medium text-blue-900 sm:text-sm">
                  {draftResults.length} total | {draftResults.filter(r => !r.is_keeper).length} drafted | {draftResults.filter(r => r.is_keeper).length} kept
                </span>
              </div>
            )}
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
                            <div className="flex items-center space-x-2 min-w-0">
                              {result.players.yahoo_image_url ? (
                                <img
                                  src={result.players.yahoo_image_url}
                                  alt={result.players.name}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                              )}
                              <div className="truncate">
                                {result.players.name}
                                {result.is_keeper && <span className="ml-1 px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs font-bold">K</span>}
                                {result.is_topper && <span className="ml-1">🎩</span>}
                                {result.is_bottom && <span className="ml-1">🍑</span>}
                              </div>
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
                      <div className="flex items-center space-x-4 mb-4">
                        {playerHistory.player.yahoo_image_url ? (
                          <img
                            src={playerHistory.player.yahoo_image_url}
                            alt={playerHistory.player.name}
                            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{playerHistory.player.name}</h2>
                      </div>
                      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
                        <StatsCard
                          title="Draft Records"
                          value={playerHistory.draftHistory.length}
                          variant="blue"
                          size="sm"
                        />
                        <StatsCard
                          title="Total Draft Dollars"
                          value={`$${playerHistory.draftHistory.reduce((total, record) => total + (record.draft_price || 0), 0)}`}
                          variant="default"
                          size="sm"
                        />
                        <StatsCard
                          title="AADP"
                          value={`$${playerHistory.draftHistory.length > 0 ? (playerHistory.draftHistory.reduce((total, record) => total + (record.draft_price || 0), 0) / playerHistory.draftHistory.length).toFixed(1) : '0.0'}`}
                          variant="orange"
                          size="sm"
                        />
                        <StatsCard
                          title="Topper Records"
                          value={playerHistory.topperHistory.length}
                          variant="green"
                          size="sm"
                        />
                        <StatsCard
                          title="Bottom Records"
                          value={playerHistory.draftHistory.filter(record => record.is_bottom).length}
                          variant="red"
                          size="sm"
                        />
                        <StatsCard
                          title="LSL Records"
                          value={playerHistory.lslHistory.length}
                          variant="purple"
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Draft History */}
                    {playerHistory.draftHistory.length > 0 && (
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="bg-blue-600 text-white px-4 py-3 sm:px-6 sm:py-4">
                          <h3 className="text-base font-semibold sm:text-lg">Draft History</h3>
                        </div>
                        <DataTable<DraftResult>
                          columns={[
                            {
                              key: 'seasons.name',
                              header: 'Season',
                              render: (_, result) => result.seasons.name,
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
                              render: (_, result) => (
                                <div className="flex items-center space-x-2">
                                  {result.is_keeper ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Keeper
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      Draft
                                    </span>
                                  )}
                                  {result.is_bottom && (
                                    <span>
                                      🍑 <span className="text-gray-900">({playerHistory.managersMap && result.bottom_manager_id && playerHistory.managersMap[result.bottom_manager_id] 
                                        ? playerHistory.managersMap[result.bottom_manager_id].manager_name 
                                        : 'Unknown'})</span>
                                    </span>
                                  )}
                                </div>
                              )
                            }
                          ]}
                          data={playerHistory.draftHistory}
                          className="shadow-none"
                        />
                      </div>
                    )}


                    {/* LSL History */}
                    {playerHistory.lslHistory.length > 0 && (
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="bg-purple-600 text-white px-4 py-3 sm:px-6 sm:py-4">
                          <h3 className="text-base font-semibold sm:text-lg">LSL History</h3>
                        </div>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {playerHistory.lslHistory.map((result) => (
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