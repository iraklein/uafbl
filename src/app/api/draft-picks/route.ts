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

interface _DraftResult {
  id: number
  draft_price: number
  is_keeper: boolean
  created_at: string
  players: Player
  managers: Manager
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const seasonId = searchParams.get('season_id')

  if (!seasonId) {
    return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('draft_results')
      .select(`
        id,
        draft_price,
        is_keeper,
        created_at,
        players(id, name),
        managers!draft_results_manager_id_fkey(id, manager_name, team_name)
      `)
      .eq('season_id', seasonId)
      .order('created_at', { ascending: false }) // Most recent first

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get topper information for each pick  
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichedData = await Promise.all((data || []).map(async (pick: any) => {
      // Check if this player has toppers for this season
      const { data: topperData } = await supabase
        .from('toppers')
        .select(`
          managers(manager_name)
        `)
        .eq('player_id', pick.players?.id)
        .eq('season_id', seasonId)

      const topperManagers = topperData?.map(t => {
        const manager = Array.isArray(t.managers) ? t.managers[0] : t.managers
        return manager?.manager_name
      }).filter(Boolean) || []
      
      const player = Array.isArray(pick.players) ? pick.players[0] : pick.players
      const manager = Array.isArray(pick.managers) ? pick.managers[0] : pick.managers
      
      return {
        id: pick.id,
        player_id: player?.id,
        player_name: player?.name,
        manager_id: manager?.id,
        manager_name: manager?.manager_name,
        draft_price: pick.draft_price,
        is_keeper: pick.is_keeper,
        is_topper: topperManagers.length > 0,
        topper_managers: topperManagers,
        season_id: parseInt(seasonId),
        created_at: pick.created_at
      }
    }))

    return NextResponse.json(enrichedData)
  } catch (error) {
    console.error('Draft picks GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const body = await request.json()
    const { 
      player_id, 
      manager_id, 
      draft_price, 
      is_keeper, 
      is_topper, 
      topper_manager_ids = [], 
      season_id 
    } = body

    // Validate required fields
    if (!player_id || !manager_id || draft_price === undefined || !season_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert the draft result
    const { data: draftResult, error: draftError } = await supabase
      .from('draft_results')
      .insert({
        player_id,
        manager_id,
        season_id,
        draft_price,
        is_keeper: is_keeper || false
      })
      .select()
      .single()

    if (draftError) {
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }

    // If this is a topper, insert topper records
    if (is_topper && topper_manager_ids.length > 0) {
      const topperInserts = topper_manager_ids.map((managerId: number) => ({
        player_id,
        manager_id: managerId,
        season_id,
        is_winner: managerId === manager_id, // The winning manager
        is_unused: false
      }))

      const { error: topperError } = await supabase
        .from('toppers')
        .insert(topperInserts)

      if (topperError) {
        console.error('Topper insert error:', topperError)
        // Don't fail the whole request if topper insert fails
      }
    }

    return NextResponse.json({ success: true, data: draftResult })
  } catch (error) {
    console.error('Draft picks POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}