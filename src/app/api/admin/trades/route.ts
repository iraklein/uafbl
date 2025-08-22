import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase'


export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  try {
    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('season_id')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    // Fetch trades for the season from trades table (only in-season trades)
    const { data: tradesData, error } = await supabase
      .from('trades')
      .select(`
        id,
        season_id,
        proposer_players,
        receiver_players,
        created_at,
        was_offseason
      `)
      .eq('season_id', seasonId)
      .eq('status', 'accepted')
      .eq('was_offseason', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
    }

    // Transform trades data to individual player trade records
    const trades: any[] = []
    tradesData?.forEach((trade) => {
      // Add proposer players
      if (trade.proposer_players && Array.isArray(trade.proposer_players)) {
        trade.proposer_players.forEach((playerId: string) => {
          trades.push({
            id: `${trade.id}-proposer-${playerId}`,
            season_id: trade.season_id,
            player_id: parseInt(playerId),
            created_at: trade.created_at,
            trade_id: trade.id
          })
        })
      }
      
      // Add receiver players
      if (trade.receiver_players && Array.isArray(trade.receiver_players)) {
        trade.receiver_players.forEach((playerId: string) => {
          trades.push({
            id: `${trade.id}-receiver-${playerId}`,
            season_id: trade.season_id,
            player_id: parseInt(playerId),
            created_at: trade.created_at,
            trade_id: trade.id
          })
        })
      }
    })

    // Get player names for the trades
    if (trades.length > 0) {
      const playerIds = [...new Set(trades.map(t => t.player_id))]
      const { data: players } = await supabase
        .from('players')
        .select('id, name')
        .in('id', playerIds)

      const playerMap = new Map(players?.map(p => [p.id, p]) || [])
      
      // Add player info to trades
      trades.forEach(trade => {
        trade.players = playerMap.get(trade.player_id) || { id: trade.player_id, name: 'Unknown Player' }
      })
    }

    return NextResponse.json(trades || [])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}