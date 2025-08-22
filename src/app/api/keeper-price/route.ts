import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const playerId = searchParams.get('player_id')
  const seasonId = searchParams.get('season_id')

  if (!playerId || !seasonId) {
    return NextResponse.json({ error: 'Player ID and Season ID are required' }, { status: 400 })
  }

  try {
    // Calculate keeper cost based on PREVIOUS season data (for drafting purposes)
    const previousSeasonId = parseInt(seasonId) === 19 ? 18 : parseInt(seasonId) - 1 // For 2025-26 (ID 19), previous is 2024-25 (ID 18)
    
    // Get player's roster info from the previous season 
    const { data: rosterData, error: rosterError } = await supabase
      .from('rosters')
      .select('consecutive_keeps, keeper_cost')
      .eq('player_id', playerId)
      .eq('season_id', previousSeasonId)
      .single()

    if (rosterError && rosterError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      return NextResponse.json({ error: rosterError.message }, { status: 500 })
    }

    // Get the draft price from the PREVIOUS season for this player
    const { data: draftData, error: draftError } = await supabase
      .from('draft_results')
      .select(`
        draft_price,
        seasons!inner (
          id
        )
      `)
      .eq('player_id', playerId)
      .eq('seasons.id', previousSeasonId)
      .single()

    if (draftError && draftError.code !== 'PGRST116') {
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }

    // If no previous season data found, this is a new player (first time eligible to be kept)
    if (!rosterData) {
      return NextResponse.json({
        keeper_price: null, // Can't be kept if not on roster last season
        consecutive_keeps: 0,
        last_draft_price: null,
        trade_count: 0
      })
    }

    // Use the stored keeper_cost from previous season as the basis
    // Note: This represents what it would cost to keep them for the CURRENT season
    const previousSeasonDraftPrice = (draftData?.draft_price as number) || null
    const consecutiveKeeps = rosterData.consecutive_keeps || 0

    return NextResponse.json({
      keeper_price: rosterData.keeper_cost,
      consecutive_keeps: consecutiveKeeps,
      last_draft_price: previousSeasonDraftPrice,
      trade_count: 0 // Trade count is already factored into the stored keeper_cost
    })
  } catch (error) {
    console.error('Keeper price API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}