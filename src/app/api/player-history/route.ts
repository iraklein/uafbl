import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const playerId = searchParams.get('player_id')
  const playerName = searchParams.get('player_name')

  if (!playerId && !playerName) {
    return NextResponse.json({ error: 'Player ID or player name is required' }, { status: 400 })
  }

  try {
    let player: { id: any; name: any; yahoo_image_url: any } | null = null
    let finalPlayerId: any = null

    if (playerId) {
      // Direct lookup by player ID
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('id, name, yahoo_image_url')
        .eq('id', playerId)
        .single()

      if (playerError) {
        return NextResponse.json({ error: playerError.message }, { status: 500 })
      }

      player = playerData
      finalPlayerId = playerData.id
    } else {
      // Search for players with similar names
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name, yahoo_image_url')
        .ilike('name', `%${playerName}%`)

      if (playersError) {
        return NextResponse.json({ error: playersError.message }, { status: 500 })
      }

      if (!players || players.length === 0) {
        return NextResponse.json({ 
          player: null,
          draftHistory: [],
          topperHistory: [],
          lslHistory: []
        })
      }

      // For now, use the first matching player (we can improve this later)
      player = players[0]
      finalPlayerId = (player as any).id
    }

    // Execute all history queries in parallel for better performance
    const [
      { data: draftHistory, error: draftError },
      { data: topperHistory, error: topperError },
      { data: lslHistory, error: lslError },
      { data: managers, error: managersError }
    ] = await Promise.all([
      // Get draft history
      supabase
        .from('draft_results')
        .select(`
          id,
          draft_price,
          is_keeper,
          is_bottom,
          bottom_manager_id,
          manager_id,
          season_id,
          seasons(id, year, name)
        `)
        .eq('player_id', finalPlayerId)
        .order('seasons(year)', { ascending: false })
        .limit(20), // Limit to prevent excessive data

      // Get topper history
      supabase
        .from('toppers')
        .select(`
          id,
          season_id,
          manager_id,
          is_winner,
          is_unused,
          seasons(year, name)
        `)
        .eq('player_id', finalPlayerId)
        .order('seasons(year)', { ascending: false })
        .limit(10), // Most players won't have many toppers

      // Get LSL history
      supabase
        .from('lsl')
        .select(`
          id,
          year,
          draft_price,
          status,
          original_manager_id,
          draft_manager_id
        `)
        .eq('player_id', finalPlayerId)
        .order('year', { ascending: false })
        .limit(5), // Each player can only have one LSL, but limit just in case

      // Get managers data
      supabase.from('managers').select('id, manager_name, team_name')
    ])

    if (draftError || topperError || lslError || managersError) {
      console.error('Error fetching player history:', { draftError, topperError, lslError, managersError })
      return NextResponse.json({ error: 'Failed to fetch player history' }, { status: 500 })
    }

    // Create managers lookup map
    const managersMap: Record<number, any> = {}
    if (managers) {
      managers.forEach((manager: any) => {
        managersMap[manager.id] = manager
      })
    }

    // Check for topper history to mark draft entries
    const topperSeasonIds = new Set((topperHistory || []).map((t: any) => t.season_id))

    // Format the data to match the DraftResult interface expected by draft-results page
    const formattedDraftHistory = (draftHistory || []).map((entry: any) => {
      const manager = managersMap[entry.manager_id]
      return {
        id: entry.id,
        draft_price: entry.draft_price,
        is_keeper: entry.is_keeper,
        is_topper: topperSeasonIds.has(entry.seasons?.id),
        is_bottom: entry.is_bottom || false,
        bottom_manager_id: entry.bottom_manager_id,
        consecutive_keeps: null, // Not available in this query
        players: {
          id: finalPlayerId,
          name: player?.name || '',
          yahoo_image_url: player?.yahoo_image_url || null
        },
        managers: {
          manager_name: manager?.manager_name || 'Unknown',
          team_name: manager?.team_name || null
        },
        seasons: {
          id: entry.seasons?.id,
          year: entry.seasons?.year,
          name: entry.seasons?.name
        }
      }
    })

    // Also format data for PlayerPreview component (flattened structure)
    const playerPreviewDraftHistory = (draftHistory || []).map((entry: any) => {
      const manager = managersMap[entry.manager_id]
      return {
        season_id: entry.seasons?.id,
        season_name: entry.seasons?.name || `${entry.seasons?.year}`,
        manager_name: manager?.manager_name || 'Unknown',
        team_name: manager?.team_name || null,
        draft_price: entry.draft_price,
        is_keeper: entry.is_keeper,
        is_topper: topperSeasonIds.has(entry.seasons?.id),
        is_bottom: entry.is_bottom || false,
        bottom_manager_id: entry.bottom_manager_id
      }
    })

    // Format topper history with manager info
    const formattedTopperHistory = (topperHistory || []).map((entry: any) => {
      const manager = managersMap[entry.manager_id]
      return {
        ...entry,
        managers: {
          manager_name: manager?.manager_name || 'Unknown'
        }
      }
    })

    // Format LSL history with manager info
    const formattedLslHistory = (lslHistory || []).map((entry: any) => {
      const originalManager = managersMap[entry.original_manager_id]
      const draftManager = managersMap[entry.draft_manager_id]
      return {
        ...entry,
        original_managers: {
          manager_name: originalManager?.manager_name || 'Unknown'
        },
        draft_managers: {
          manager_name: draftManager?.manager_name || 'Unknown'
        }
      }
    })

    return NextResponse.json({
      player,
      draftHistory: formattedDraftHistory, // For draft-results page (nested structure)
      draft_history: playerPreviewDraftHistory, // For PlayerPreview component (flattened structure) 
      topperHistory: formattedTopperHistory,
      lslHistory: formattedLslHistory,
      managersMap: managersMap // Include managers data for bottom manager lookup
    })
  } catch (error) {
    console.error('Player history API Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}