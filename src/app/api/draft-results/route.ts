import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'
import { calculateKeeperCost } from '../../../../lib/keeper-utils'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const seasonId = searchParams.get('season_id')

  try {
    // Build draft results query
    let draftQuery = supabase
      .from('draft_results')
      .select(`
        id,
        draft_price,
        is_keeper,
        player_id,
        players(name),
        managers(manager_name, team_name),
        seasons(year, name)
      `)
      .order('managers(manager_name)', { ascending: true })
      .order('draft_price', { ascending: false })

    if (seasonId) {
      draftQuery = draftQuery.eq('season_id', seasonId)
    }

    // Execute all queries in parallel for better performance
    const queries: any[] = [draftQuery]
    
    if (seasonId) {
      queries.push(
        supabase
          .from('toppers')
          .select('player_id')
          .eq('season_id', seasonId)
          .eq('is_unused', false),
        supabase
          .from('trades')
          .select('player_id')
          .eq('season_id', seasonId),
        supabase
          .from('rosters')
          .select('player_id, consecutive_keeps')
          .eq('season_id', seasonId)
      )
    }

    const results = await Promise.all(queries)
    
    const { data: draftResults, error: draftError } = results[0]

    if (draftError) {
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }

    // Early return if no draft results
    if (!draftResults || draftResults.length === 0) {
      return NextResponse.json([])
    }

    // Process parallel query results
    let topperPlayerIds = new Set<number>()
    let tradeCountMap: Record<number, number> = {}
    let consecutiveKeepsMap: Record<number, number | null> = {}

    if (seasonId && results.length > 1) {
      // Process toppers data
      const toppersResult = results[1]
      if (toppersResult && !toppersResult.error && toppersResult.data) {
        topperPlayerIds = new Set(toppersResult.data.map((t: any) => t.player_id))
      }

      // Process trades data  
      const tradesResult = results[2]
      if (tradesResult && !tradesResult.error && tradesResult.data) {
        tradesResult.data.forEach((trade: any) => {
          tradeCountMap[trade.player_id] = (tradeCountMap[trade.player_id] || 0) + 1
        })
      }

      // Process rosters data
      const rostersResult = results[3]
      if (rostersResult && !rostersResult.error && rostersResult.data) {
        rostersResult.data.forEach((roster: any) => {
          consecutiveKeepsMap[roster.player_id] = roster.consecutive_keeps
        })
      }
    }

    // Add topper information and calculated keeper costs to draft results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultsWithToppers = draftResults?.map((result: any) => {
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