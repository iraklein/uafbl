import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'
import { calculateKeeperCost } from '../../../../lib/keeper-utils'

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
      
      // Get trade counts for all players in this season
      supabase
        .from('trades_old')
        .select('player_id')
        .eq('season_id', seasonId)
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

    // Create a map of player_id to trade count
    const tradeCountMap: Record<number, number> = {}
    tradesData?.forEach((trade: any) => {
      tradeCountMap[trade.player_id] = (tradeCountMap[trade.player_id] || 0) + 1
    })

    // Add draft prices, keeper status, and calculated keeper costs to roster data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rostersWithPrices = (rosters as any[] || []).map((roster: any) => {
      const playerId = Array.isArray(roster.players) ? roster.players[0]?.id || 0 : roster.players?.id || 0
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
    })

    return NextResponse.json(rostersWithPrices)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}