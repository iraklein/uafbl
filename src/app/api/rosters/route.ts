import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

interface Player {
  id: number
  name: string
}

interface Manager {
  id: number
  manager_name: string
  team_name?: string
}

interface _RosterData {
  id: number
  keeper_cost: number | null
  consecutive_keeps: number | null
  players: Player | Player[]
  managers: Manager | Manager[]
}


export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('season_id')
    const managerId = searchParams.get('manager_id')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    // Build rosters query with optional manager filter
    let rostersQuery = supabase
      .from('rosters')
      .select(`
        id,
        keeper_cost,
        consecutive_keeps,
        players (
          id,
          name
        ),
        managers (
          id,
          manager_name,
          team_name
        )
      `)
      .eq('season_id', seasonId)
    
    // Add manager filter if provided
    if (managerId) {
      rostersQuery = rostersQuery.eq('manager_id', managerId)
    }

    // Execute all queries in parallel for better performance
    const [
      { data: rosters, error: rostersError },
      { data: draftPrices, error: draftError },
      { data: tradesData, error: tradesError }
    ] = await Promise.all([
      rostersQuery,
      
      // Get draft prices and keeper status from CURRENT season for each player
      supabase
        .from('draft_results')
        .select(`
          player_id,
          draft_price,
          is_keeper,
          seasons!inner (
            id
          )
        `)
        .eq('seasons.id', seasonId),
      
      // Get trade counts for all players from trades table (only in-season trades)
      supabase
        .from('trades')
        .select('proposer_players, receiver_players')
        .eq('season_id', seasonId)
        .eq('status', 'accepted')
        .eq('was_offseason', false)
    ])

    if (rostersError) {
      console.error('Database error:', rostersError)
      return NextResponse.json({ error: 'Failed to fetch rosters' }, { status: 500 })
    }

    if (draftError) {
      console.error('Draft prices error:', draftError)
      return NextResponse.json({ error: 'Failed to fetch draft prices' }, { status: 500 })
    }

    if (tradesError) {
      console.error('Trades error:', tradesError)
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
    }

    // Early return if no rosters found
    if (!rosters || rosters.length === 0) {
      return NextResponse.json([])
    }

    // Create a map of player_id to draft info (price and keeper status)
    const draftInfoMap: Record<number, { draft_price: number | null; is_keeper: boolean }> = {}
    draftPrices?.forEach((dp: any) => {
      draftInfoMap[dp.player_id] = {
        draft_price: dp.draft_price,
        is_keeper: dp.is_keeper
      }
    })

    // Create a map of player_id to trade count from trades table
    const tradeCountMap: Record<number, number> = {}
    tradesData?.forEach((trade: any) => {
      // Count players from proposer_players array
      if (trade.proposer_players && Array.isArray(trade.proposer_players)) {
        trade.proposer_players.forEach((playerId: string) => {
          const id = parseInt(playerId)
          tradeCountMap[id] = (tradeCountMap[id] || 0) + 1
        })
      }
      
      // Count players from receiver_players array
      if (trade.receiver_players && Array.isArray(trade.receiver_players)) {
        trade.receiver_players.forEach((playerId: string) => {
          const id = parseInt(playerId)
          tradeCountMap[id] = (tradeCountMap[id] || 0) + 1
        })
      }
    })

    // Add draft prices, keeper status, and calculated keeper costs to roster data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rostersWithPrices = (rosters as any[] || []).map((roster: any) => {
      const playerId = Array.isArray(roster.players) ? roster.players[0]?.id || 0 : roster.players?.id || 0
      const draftPrice = draftInfoMap[playerId]?.draft_price || null
      const isKeeper = draftInfoMap[playerId]?.is_keeper || false
      const tradeCount = tradeCountMap[playerId] || 0
      
      return {
        ...roster,
        draft_price: draftPrice,
        is_keeper: isKeeper,
        trade_count: tradeCount
      }
    })

    return NextResponse.json(rostersWithPrices)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}