import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const playerName = searchParams.get('player_name')

  if (!playerName) {
    return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
  }

  try {
    // Search for players with similar names
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name')
      .ilike('name', `%${playerName}%`)

    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 })
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ 
        player: null,
        draft_history: [],
        topper_history: [],
        lsl_history: []
      })
    }

    // For now, use the first matching player (we can improve this later)
    const player = players[0]

    // Get draft history
    const { data: draftHistory, error: draftError } = await supabase
      .from('draft_results')
      .select(`
        id,
        draft_price,
        is_keeper,
        managers(manager_name),
        seasons(year, name)
      `)
      .eq('player_id', player.id)
      .order('seasons(year)', { ascending: false })

    // Get topper history
    const { data: topperHistory, error: topperError } = await supabase
      .from('toppers')
      .select(`
        *,
        managers(manager_name),
        seasons(year, name)
      `)
      .eq('player_id', player.id)
      .order('seasons(year)', { ascending: false })

    // Get LSL history
    const { data: lslHistory, error: lslError } = await supabase
      .from('lsl')
      .select(`
        *,
        original_managers:managers!original_manager_id(manager_name),
        draft_managers:managers!draft_manager_id(manager_name)
      `)
      .eq('player_id', player.id)
      .order('year', { ascending: false })

    if (draftError || topperError || lslError) {
      console.error('Error fetching player history:', { draftError, topperError, lslError })
      return NextResponse.json({ error: 'Failed to fetch player history' }, { status: 500 })
    }

    return NextResponse.json({
      player,
      draft_history: draftHistory || [],
      topper_history: topperHistory || [],
      lsl_history: lslHistory || []
    })
  } catch (error) {
    console.error('Player history API Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}