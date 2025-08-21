'use client'

import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import SeasonSelector from '../../components/SeasonSelector'
import LoadingState from '../../components/LoadingState'
import ErrorAlert from '../../components/ErrorAlert'
import DataTable, { Column } from '../../components/DataTable'
import { useSeasons } from '../../hooks/useSeasons'
import { Trade } from '../../types'


interface PlayerTradeCount {
  player_id: number
  player_name: string
  trade_count: number
}

export default function Trades() {
  const { seasons, selectedSeason, setSelectedSeason, loading, error } = useSeasons()
  const [trades, setTrades] = useState<Trade[]>([])
  const [tradesLoading, setTradesLoading] = useState(false)
  const [tradesError, setTradesError] = useState('')

  // Fetch trades when season changes
  useEffect(() => {
    if (!selectedSeason) return

    async function fetchTrades() {
      setTradesLoading(true)
      setTradesError('')

      try {
        const response = await fetch(`/api/admin/trades?season_id=${selectedSeason}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('API error response:', response.status, errorData)
          throw new Error(`API Error ${response.status}: ${errorData.error || 'Failed to fetch trades'}`)
        }
        
        const data = await response.json()
        console.log('Trades data received:', data)
        setTrades(data)
      } catch (error) {
        console.error('Error fetching trades:', error)
        setTradesError(error instanceof Error ? error.message : 'Failed to load trades')
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


  // Define columns for the DataTable
  const columns: Column<PlayerTradeCount>[] = [
    {
      key: 'player_name',
      header: 'Player',
      className: 'font-medium'
    },
    {
      key: 'trade_count',
      header: 'Trade Count'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header />

        <div className="mb-8">
          
          {/* Header with inline season selector */}
          <div className="flex items-center space-x-6 mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Player Trades</h2>
            
            {/* Season Selector */}
            <SeasonSelector
              seasons={seasons}
              selectedSeason={selectedSeason}
              onSeasonChange={setSelectedSeason}
              loading={loading}
            />

            {/* Trade count info box */}
            {selectedSeason && (
              <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium text-blue-900">{trades.length} total trades | {sortedPlayerTradeCounts.length} players traded</span>
              </div>
            )}
          </div>
        </div>

        <ErrorAlert error={error} />
        <ErrorAlert error={tradesError} />

        {loading ? (
          <LoadingState message="Loading seasons..." />
        ) : tradesLoading ? (
          <LoadingState message="Loading trades..." />
        ) : selectedSeason ? (
          <>
            <DataTable
              columns={columns}
              data={sortedPlayerTradeCounts}
              emptyMessage="No trades found for this season."
              size="md"
            />
          </>
        ) : (
          <LoadingState message="Please select a season to view trades." />
        )}
      </div>
    </div>
  )
}