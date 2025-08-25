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

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()
    const { player_id, manager_id, season_id, consecutive_keeps = 0 } = body

    if (!player_id || !manager_id || !season_id) {
      return NextResponse.json({ 
        error: 'Player ID, Manager ID, and Season ID are required' 
      }, { status: 400 })
    }

    // Check if roster entry already exists
    const { data: existing, error: existingError } = await supabase
      .from('rosters')
      .select('id')
      .eq('player_id', player_id)
      .eq('manager_id', manager_id)
      .eq('season_id', season_id)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: 'Player is already on this manager\'s roster for this season' 
      }, { status: 409 })
    }

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing roster:', existingError)
      return NextResponse.json({ error: 'Failed to check existing roster' }, { status: 500 })
    }

    // Calculate keeper cost automatically
    console.log(`Calculating keeper cost for player ${player_id} in season ${season_id}`)
    
    // Get player's draft price for this season
    const { data: draftResult, error: draftError } = await supabase
      .from('draft_results')
      .select('draft_price')
      .eq('player_id', player_id)
      .eq('season_id', season_id)
      .single()
    
    if (draftError && draftError.code !== 'PGRST116') {
      console.error('Error fetching draft price:', draftError)
      return NextResponse.json({ error: 'Failed to fetch draft price' }, { status: 500 })
    }
    
    // Get trade count for this player this season
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('proposer_players, receiver_players')
      .eq('season_id', season_id)
      .eq('status', 'accepted')
      .eq('was_offseason', false)
    
    if (tradesError) {
      console.error('Error fetching trades:', tradesError)
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
    }
    
    // Count trades for this player
    let tradeCount = 0
    trades?.forEach(trade => {
      if (trade.proposer_players && Array.isArray(trade.proposer_players)) {
        if (trade.proposer_players.some((id: string) => parseInt(id) === player_id)) {
          tradeCount++
        }
      }
      if (trade.receiver_players && Array.isArray(trade.receiver_players)) {
        if (trade.receiver_players.some((id: string) => parseInt(id) === player_id)) {
          tradeCount++
        }
      }
    })
    
    const draftPrice: number | null = (draftResult?.draft_price && typeof draftResult.draft_price === 'number') 
      ? draftResult.draft_price 
      : null
    const keeperCost = calculateKeeperCost(draftPrice, consecutive_keeps, tradeCount)
    
    console.log(`Keeper cost calculation: draft=$${draftPrice}, keeps=${consecutive_keeps}, trades=${tradeCount}, result=$${keeperCost}`)

    // Insert roster entry with calculated keeper cost
    const { data, error } = await supabase
      .from('rosters')
      .insert({
        player_id,
        manager_id,
        season_id,
        keeper_cost: keeperCost,
        consecutive_keeps: consecutive_keeps
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to add player to roster' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Player added to roster successfully',
      roster: data,
      keeper_cost: keeperCost
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}