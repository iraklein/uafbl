import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerSupabaseClient()
  try {
    const { id } = await params
    const tradeId = parseInt(id)
    const body = await request.json()
    const { status, responded_at, proposer_players, receiver_players } = body

    // Build update object with only provided fields
    const updates: any = {}
    
    if (status) {
      if (!['accepted', 'rejected', 'pending', 'canceled'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = status
      // Only set responded_at if provided or if accepting/rejecting
      if (responded_at || ['accepted', 'rejected'].includes(status)) {
        updates.responded_at = responded_at || new Date().toISOString()
      }
    }
    
    if (proposer_players !== undefined) {
      updates.proposer_players = proposer_players
    }
    
    if (receiver_players !== undefined) {
      updates.receiver_players = receiver_players
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // If accepting a trade, handle roster transfers
    if (status === 'accepted') {
      // Get the full trade data first
      const { data: tradeData, error: fetchError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', tradeId)
        .single()

      if (fetchError || !tradeData) {
        console.error('Failed to fetch trade data:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch trade data' }, { status: 500 })
      }

      // Get the active playing season for roster updates
      const { data: activeSeason, error: seasonError } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single()

      if (seasonError || !activeSeason) {
        console.error('Failed to get active season:', seasonError)
        return NextResponse.json({ error: 'Failed to get active season' }, { status: 500 })
      }

      // Set impacts_season_id to the active playing season
      updates.impacts_season_id = activeSeason.id

      // Handle player roster transfers if players are involved
      const proposerPlayers = Array.isArray(tradeData.proposer_players) ? tradeData.proposer_players : []
      const receiverPlayers = Array.isArray(tradeData.receiver_players) ? tradeData.receiver_players : []

      if (proposerPlayers.length > 0 || receiverPlayers.length > 0) {
        // Transfer proposer's players to receiver
        if (proposerPlayers.length > 0) {
          const { error: transferError1 } = await supabase
            .from('rosters')
            .update({ manager_id: tradeData.receiver_manager_id })
            .in('player_id', proposerPlayers)
            .eq('season_id', activeSeason.id as number)

          if (transferError1) {
            console.error('Failed to transfer proposer players:', transferError1)
            return NextResponse.json({ error: 'Failed to transfer proposer players' }, { status: 500 })
          }
        }

        // Transfer receiver's players to proposer
        if (receiverPlayers.length > 0) {
          const { error: transferError2 } = await supabase
            .from('rosters')
            .update({ manager_id: tradeData.proposer_manager_id })
            .in('player_id', receiverPlayers)
            .eq('season_id', activeSeason.id as number)

          if (transferError2) {
            console.error('Failed to transfer receiver players:', transferError2)
            return NextResponse.json({ error: 'Failed to transfer receiver players' }, { status: 500 })
          }
        }
      }
    }

    // Update the trade
    const { data, error } = await supabase
      .from('trades')
      .update(updates)
      .eq('id', tradeId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update trade', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Trade ${status} successfully`,
      trade: data 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}