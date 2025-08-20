'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Player {
  id: number
  name: string
}

interface Manager {
  id: number
  manager_name: string
}

interface Roster {
  id: number
  keeper_cost: number | null
  consecutive_keeps: number | null
  trades: number
  draft_price: number | null
  is_keeper: boolean
  trade_count: number
  calculated_keeper_cost: number | null
  players: Player
  managers: Manager
}

interface SeasonOption {
  id: number
  year: number
  name: string
}

interface GroupedRosters {
  [managerName: string]: Roster[]
}

export default function Rosters() {
  const [seasons, setSeasons] = useState<SeasonOption[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [rosters, setRosters] = useState<Roster[]>([])
  const [loading, setLoading] = useState(true)
  const [rostersLoading, setRostersLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch seasons for dropdown
  useEffect(() => {
    async function fetchSeasons() {
      try {
        const response = await fetch('/api/seasons')
        if (!response.ok) throw new Error('Failed to fetch seasons')
        
        const data = await response.json()
        setSeasons(data)
        
        // Find the most recent season with data (default to 2024-25 if available)
        if (data.length > 0) {
          const season2024_25 = data.find((season: SeasonOption) => season.name.includes('2024-25') || season.year === 2024)
          if (season2024_25) {
            setSelectedSeason(season2024_25.id.toString())
          } else {
            // Fall back to the most recent season
            setSelectedSeason(data[0].id.toString())
          }
        }
      } catch (error) {
        console.error('Error fetching seasons:', error)
        setError('Failed to load seasons')
      } finally {
        setLoading(false)
      }
    }

    fetchSeasons()
  }, [])

  // Fetch rosters when season changes
  useEffect(() => {
    if (!selectedSeason) return

    async function fetchRosters() {
      setRostersLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/rosters?season_id=${selectedSeason}`)
        if (!response.ok) throw new Error('Failed to fetch rosters')
        
        const data = await response.json()
        setRosters(data)
      } catch (error) {
        console.error('Error fetching rosters:', error)
        setError('Failed to load rosters')
      } finally {
        setRostersLoading(false)
      }
    }

    fetchRosters()
  }, [selectedSeason])

  // Group rosters by manager
  const groupedRosters: GroupedRosters = rosters.reduce((acc, roster) => {
    const managerName = roster.managers.manager_name
    if (!acc[managerName]) {
      acc[managerName] = []
    }
    acc[managerName].push(roster)
    return acc
  }, {} as GroupedRosters)

  // Sort managers and their players
  const sortedManagers = Object.entries(groupedRosters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([managerName, managerRosters]) => ({
      managerName,
      players: managerRosters.sort((a, b) => {
        // Sort by draft price descending (highest first), then by name if no price
        const priceA = a.draft_price || 0;
        const priceB = b.draft_price || 0;
        if (priceA !== priceB) {
          return priceB - priceA; // Descending order
        }
        // If same price (or both null), sort by name
        return a.players.name.localeCompare(b.players.name);
      })
    }))

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
                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md"
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
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
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
          
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Team Rosters</h2>
          
          {/* Season Selector */}
          <div className="mb-6">
            <label htmlFor="season-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Season:
            </label>
            <select
              id="season-select"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              disabled={loading}
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
              <h3 className="text-xl font-semibold text-gray-800">{selectedSeasonName}</h3>
              <p className="text-gray-600">{rosters.length} total players</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="text-lg text-gray-600">Loading seasons...</div>
          </div>
        ) : rostersLoading ? (
          <div className="text-center py-8">
            <div className="text-lg text-gray-600">Loading rosters...</div>
          </div>
        ) : selectedSeason ? (
          <>
            {sortedManagers.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedManagers.map(({ managerName, players }) => (
                  <div key={managerName} className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="bg-indigo-600 text-white px-3 py-2">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold">{managerName}</h3>
                        <div className="text-xs">
                          <span>{players.length}</span>
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
                            <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-tight">
                              Trades
                            </th>
                            <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-tight">
                              Keep $
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {players.map((roster) => (
                            <tr key={roster.id} className="hover:bg-gray-50">
                              <td className="px-2 py-1 text-xs font-medium text-gray-900 truncate max-w-0">
                                <div className="truncate">{roster.players.name}</div>
                              </td>
                              <td className="px-1 py-1 text-xs text-gray-700 text-center">
                                {roster.draft_price ? `$${roster.draft_price}` : '-'}
                              </td>
                              <td className="px-1 py-1 text-xs text-gray-700 text-center">
                                {roster.consecutive_keeps !== null ? roster.consecutive_keeps + 1 : '-'}
                              </td>
                              <td className="px-1 py-1 text-xs text-gray-700 text-center">
                                {roster.trade_count ? roster.trade_count : '-'}
                              </td>
                              <td className="px-1 py-1 text-xs text-gray-700 text-center">
                                {roster.calculated_keeper_cost ? `$${roster.calculated_keeper_cost}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-lg text-gray-600">No rosters found for this season.</div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-lg text-gray-600">Please select a season to view rosters.</div>
          </div>
        )}
      </div>
    </div>
  )
}