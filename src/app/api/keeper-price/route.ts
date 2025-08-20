import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'
import { calculateKeeperCost } from '../../../../lib/keeper-utils'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const playerId = searchParams.get('player_id')
  const seasonId = searchParams.get('season_id')

  if (!playerId || !seasonId) {
    return NextResponse.json({ error: 'Player ID and Season ID are required' }, { status: 400 })
  }

  try {
    // Get player's previous season roster info to calculate keeper price
    const previousSeasonId = parseInt(seasonId) === 1 ? 19 : parseInt(seasonId) - 1 // For 2025-26 (ID 1), previous is 2024-25 (ID 19)
    
    const { data: rosterData, error: rosterError } = await supabase
      .from('rosters')
      .select('consecutive_keeps, keeper_cost')
      .eq('player_id', playerId)
      .eq('season_id', previousSeasonId)
      .single()

    if (rosterError && rosterError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      return NextResponse.json({ error: rosterError.message }, { status: 500 })
    }

    // Get trade count for the previous season
    const { data: tradeData, error: tradeError } = await supabase
      .from('trades')
      .select('player_id')
      .eq('player_id', playerId)
      .eq('season_id', previousSeasonId)

    if (tradeError) {
      return NextResponse.json({ error: tradeError.message }, { status: 500 })
    }

    const tradeCount = tradeData?.length || 0
    const consecutiveKeeps = rosterData?.consecutive_keeps || 0
    
    // Get the last draft price for this player
    const { data: draftData, error: draftError } = await supabase
      .from('draft_results')
      .select('draft_price')
      .eq('player_id', playerId)
      .order('id', { ascending: false })
      .limit(1)
      .single()

    if (draftError && draftError.code !== 'PGRST116') {
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }

    const lastDraftPrice = (draftData?.draft_price as number) || 1
    
    // Calculate keeper cost using same logic as rosters API
    let keeperEscalationYear = 0; // Default for non-keepers (first time keep = +$10)
    
    if (rosterData?.consecutive_keeps !== null && rosterData?.consecutive_keeps !== undefined) {
      // For players who were kept, calculate cost for the NEXT keep
      keeperEscalationYear = (rosterData.consecutive_keeps as number) + 1;
    }
    
    const keeperPrice = calculateKeeperCost(lastDraftPrice, keeperEscalationYear, tradeCount)

    return NextResponse.json({
      keeper_price: keeperPrice,
      consecutive_keeps: consecutiveKeeps,
      last_draft_price: lastDraftPrice,
      trade_count: tradeCount
    })
  } catch (error) {
    console.error('Keeper price API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}