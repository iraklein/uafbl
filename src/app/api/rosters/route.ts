import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'
import { calculateKeeperCost } from '../../../../lib/keeper-utils'

interface RosterData {
  id: number
  keeper_cost: number | null
  consecutive_keeps: number | null
  players: {
    id: number
    name: string
  }
  managers: {
    id: number
    manager_name: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('season_id')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    // Fetch rosters with player, manager, and draft price information
    // We need to join with draft_results to get the draft price from the previous season (2024)
    const { data: rosters, error } = await supabase
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
          manager_name
        )
      `)
      .eq('season_id', seasonId)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch rosters' }, { status: 500 })
    }

    // Get draft prices and keeper status from 2024 season for each player
    const { data: draftPrices, error: draftError } = await supabase
      .from('draft_results')
      .select(`
        player_id,
        draft_price,
        is_keeper,
        seasons!inner (
          year
        )
      `)
      .eq('seasons.year', 2024)

    if (draftError) {
      console.error('Draft prices error:', draftError)
      return NextResponse.json({ error: 'Failed to fetch draft prices' }, { status: 500 })
    }

    // Create a map of player_id to draft info (price and keeper status)
    const draftInfoMap: Record<number, { draft_price: number | null; is_keeper: boolean }> = {}
    draftPrices?.forEach(dp => {
      draftInfoMap[dp.player_id] = {
        draft_price: dp.draft_price,
        is_keeper: dp.is_keeper
      }
    })

    // Get trade counts for all players in this season
    const { data: tradesData, error: tradesError } = await supabase
      .from('trades')
      .select('player_id')
      .eq('season_id', seasonId)

    if (tradesError) {
      console.error('Trades error:', tradesError)
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
    }

    // Create a map of player_id to trade count
    const tradeCountMap: Record<number, number> = {}
    tradesData?.forEach(trade => {
      tradeCountMap[trade.player_id] = (tradeCountMap[trade.player_id] || 0) + 1
    })

    // Add draft prices, keeper status, and calculated keeper costs to roster data
    const rostersWithPrices = (rosters as RosterData[])?.map(roster => {
      const playerId = roster.players.id
      const draftPrice = draftInfoMap[playerId]?.draft_price || null
      const isKeeper = draftInfoMap[playerId]?.is_keeper || false
      const tradeCount = tradeCountMap[playerId] || 0
      
      // Calculate the keeper cost using the utility function
      let keeperEscalationYear = 0; // Default for non-keepers (first time keep = +$10)
      
      if (roster.consecutive_keeps !== null) {
        // For players who were kept, calculate cost for the NEXT keep
        keeperEscalationYear = roster.consecutive_keeps + 1;
      }
      
      const calculatedKeeperCost = calculateKeeperCost(
        draftPrice, 
        keeperEscalationYear, 
        tradeCount
      )
      
      return {
        ...roster,
        draft_price: draftPrice,
        is_keeper: isKeeper,
        trade_count: tradeCount,
        calculated_keeper_cost: calculatedKeeperCost
      }
    }) || []

    return NextResponse.json(rostersWithPrices)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}