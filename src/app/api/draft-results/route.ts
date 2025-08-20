import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'
import { calculateKeeperCost } from '../../../../lib/keeper-utils'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const seasonId = searchParams.get('season_id')

  try {
    let query = supabase
      .from('draft_results')
      .select(`
        id,
        draft_price,
        is_keeper,
        player_id,
        players(name),
        managers(manager_name),
        seasons(year, name)
      `)
      .order('managers(manager_name)', { ascending: true })
      .order('draft_price', { ascending: false })

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data: draftResults, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get topper information for the same season (only used toppers)
    let topperData = []
    if (seasonId && draftResults && draftResults.length > 0) {
      const { data: toppers, error: topperError } = await supabase
        .from('toppers')
        .select('player_id')
        .eq('season_id', seasonId)
        .eq('is_unused', false)

      if (!topperError && toppers) {
        topperData = toppers
      }
    }

    // Create a set of player IDs that are toppers
    const topperPlayerIds = new Set(topperData.map(t => t.player_id))

    // Get trade counts for all players in this season
    let tradeCountMap = {}
    if (seasonId) {
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('player_id')
        .eq('season_id', seasonId)

      if (!tradesError && tradesData) {
        tradesData.forEach(trade => {
          tradeCountMap[trade.player_id] = (tradeCountMap[trade.player_id] || 0) + 1
        })
      }
    }

    // Get consecutive keeps data from rosters table for this season
    const consecutiveKeepsMap: Record<number, number | null> = {}
    if (seasonId) {
      const { data: rostersData, error: rostersError } = await supabase
        .from('rosters')
        .select('player_id, consecutive_keeps')
        .eq('season_id', seasonId)

      if (!rostersError && rostersData) {
        rostersData.forEach(roster => {
          consecutiveKeepsMap[roster.player_id] = roster.consecutive_keeps
        })
      }
    }

    // Add topper information and calculated keeper costs to draft results
    const resultsWithToppers = draftResults?.map(result => {
      const tradeCount = tradeCountMap[result.player_id] || 0
      const consecutiveKeeps = consecutiveKeepsMap[result.player_id]
      
      // Calculate the keeper cost using the utility function
      let keeperEscalationYear = 0; // Default for non-keepers (first time keep = +$10)
      
      if (consecutiveKeeps !== null && consecutiveKeeps !== undefined) {
        // For players who were kept, calculate cost for the NEXT keep
        keeperEscalationYear = consecutiveKeeps + 1;
      }
      
      const calculatedKeeperCost = calculateKeeperCost(
        result.draft_price,
        keeperEscalationYear,
        tradeCount
      )
      
      return {
        ...result,
        is_topper: topperPlayerIds.has(result.player_id),
        trade_count: tradeCount,
        consecutive_keeps: consecutiveKeeps,
        calculated_keeper_cost: calculatedKeeperCost
      }
    }) || []

    return NextResponse.json(resultsWithToppers)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}