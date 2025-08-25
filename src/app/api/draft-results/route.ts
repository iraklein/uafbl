import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

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
        is_bottom,
        bottom_manager_id,
        player_id,
        manager_id,
        players(name, yahoo_image_url),
        seasons(year, name)
      `)
      .order('draft_price', { ascending: false })

    if (seasonId) {
      draftQuery = draftQuery.eq('season_id', seasonId)
    }

    // Execute all queries in parallel for better performance
    const queries: any[] = [
      draftQuery,
      supabase.from('managers').select('id, manager_name, team_name')
    ]
    
    if (seasonId) {
      queries.push(
        supabase
          .from('toppers')
          .select('player_id')
          .eq('season_id', seasonId)
          .eq('is_unused', false),
        supabase
          .from('rosters')
          .select('player_id, consecutive_keeps')
          .eq('season_id', seasonId)
      )
    }

    const results = await Promise.all(queries)
    
    const { data: draftResults, error: draftError } = results[0]
    const { data: managers, error: managersError } = results[1]

    if (draftError) {
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }

    if (managersError) {
      return NextResponse.json({ error: managersError.message }, { status: 500 })
    }

    // Early return if no draft results
    if (!draftResults || draftResults.length === 0) {
      return NextResponse.json([])
    }

    // Create managers lookup map
    const managersMap: Record<number, any> = {}
    if (managers) {
      managers.forEach((manager: any) => {
        managersMap[manager.id] = manager
      })
    }

    // Process parallel query results
    let topperPlayerIds = new Set<number>()
    let consecutiveKeepsMap: Record<number, number | null> = {}

    if (seasonId && results.length > 3) {
      // Process toppers data (now at index 2)
      const toppersResult = results[2]
      if (toppersResult && !toppersResult.error && toppersResult.data) {
        topperPlayerIds = new Set(toppersResult.data.map((t: any) => t.player_id))
      }

      // Process rosters data (now at index 3)
      const rostersResult = results[3]
      if (rostersResult && !rostersResult.error && rostersResult.data) {
        rostersResult.data.forEach((roster: any) => {
          consecutiveKeepsMap[roster.player_id] = roster.consecutive_keeps
        })
      }
    }

    // Add topper information and manager data to draft results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultsWithToppers = draftResults?.map((result: any) => {
      const consecutiveKeeps = consecutiveKeepsMap[result.player_id]
      const manager = managersMap[result.manager_id]
      
      return {
        ...result,
        is_topper: topperPlayerIds.has(result.player_id),
        consecutive_keeps: consecutiveKeeps,
        managers: manager || { manager_name: 'Unknown', team_name: null }
      }
    }) || []

    return NextResponse.json(resultsWithToppers)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}