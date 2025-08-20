'use client'

import { useState, useEffect } from 'react'
import Navigation from '../../components/Navigation'

interface Player {
  id: number
  name: string
}

interface Trade {
  id: number
  player_id: number
  notes: string | null
  created_at: string
  players: Player
}

interface SeasonOption {
  id: number
  year: number
  name: string
}

interface PlayerTradeCount {
  player_id: number
  player_name: string
  trade_count: number
}

export default function Trades() {
  const [seasons, setSeasons] = useState<SeasonOption[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [tradesLoading, setTradesLoading] = useState(false)
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

  // Fetch trades when season changes
  useEffect(() => {
    if (!selectedSeason) return

    async function fetchTrades() {
      setTradesLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/admin/trades?season_id=${selectedSeason}`)
        if (!response.ok) throw new Error('Failed to fetch trades')
        
        const data = await response.json()
        setTrades(data)
      } catch (error) {
        console.error('Error fetching trades:', error)
        setError('Failed to load trades')
      } finally {
        setTradesLoading(false)
      }
    }

    fetchTrades()
  }, [selectedSeason])

  // Calculate player trade counts
  const playerTradeCounts: PlayerTradeCount[] = trades.reduce((acc, trade) => {
    const existingPlayer = acc.find(p => p.player_id === trade.player_id)
    if (existingPlayer) {
      existingPlayer.trade_count++
    } else {
      acc.push({
        player_id: trade.player_id,
        player_name: trade.players.name,
        trade_count: 1
      })
    }
    return acc
  }, [] as PlayerTradeCount[])

  // Sort by trade count descending, then by name
  const sortedPlayerTradeCounts = playerTradeCounts.sort((a, b) => {
    if (a.trade_count !== b.trade_count) {
      return b.trade_count - a.trade_count
    }
    return a.player_name.localeCompare(b.player_name)
  })

  const selectedSeasonName = seasons.find(s => s.id.toString() === selectedSeason)?.name || ''

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">UAFBL</h1>
            
            {/* Navigation Tabs */}
            <Navigation />
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Player Trades</h2>
          
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
              <p className="text-gray-600">
                {trades.length} total trades | {sortedPlayerTradeCounts.length} players traded
              </p>
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
        ) : tradesLoading ? (
          <div className="text-center py-8">
            <div className="text-lg text-gray-600">Loading trades...</div>
          </div>
        ) : selectedSeason ? (
          <>
            {sortedPlayerTradeCounts.length > 0 ? (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Player
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trade Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedPlayerTradeCounts.map((player) => (
                        <tr key={player.player_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {player.player_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {player.trade_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-lg text-gray-600">No trades found for this season.</div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-lg text-gray-600">Please select a season to view trades.</div>
          </div>
        )}
      </div>
    </div>
  )
}