import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase'
import { recalculateKeeperCosts } from '../../../../../../lib/recalculate-keeper-costs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerSupabaseClient()
  try {
    const { id } = await params
    const tradeId = parseInt(id)

    console.log(`🔄 Reverting trade ${tradeId}...`)

    // Get the trade data first to verify it's accepted and get player details
    const { data: tradeData, error: fetchError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .single()

    if (fetchError || !tradeData) {
      console.error('Failed to fetch trade data:', fetchError)
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    if (tradeData.status !== 'accepted') {
      return NextResponse.json({ error: 'Only accepted trades can be reverted' }, { status: 400 })
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

    console.log(`📋 Trade details: proposer=${tradeData.proposer_manager_id}, receiver=${tradeData.receiver_manager_id}`)

    // Handle player roster reversals if players are involved
    const proposerPlayers = Array.isArray(tradeData.proposer_players) ? tradeData.proposer_players : []
    const receiverPlayers = Array.isArray(tradeData.receiver_players) ? tradeData.receiver_players : []

    console.log(`👥 Players to revert: proposer=${proposerPlayers.length}, receiver=${receiverPlayers.length}`)

    if (proposerPlayers.length > 0 || receiverPlayers.length > 0) {
      // Revert proposer's players back to proposer (they went to receiver, now back to proposer)
      if (proposerPlayers.length > 0) {
        const { error: revertError1 } = await supabase
          .from('rosters')
          .update({ manager_id: tradeData.proposer_manager_id })
          .in('player_id', proposerPlayers)
          .eq('season_id', activeSeason.id as number)

        if (revertError1) {
          console.error('Failed to revert proposer players:', revertError1)
          return NextResponse.json({ error: 'Failed to revert proposer players' }, { status: 500 })
        }
        console.log(`✅ Reverted ${proposerPlayers.length} proposer players back to manager ${tradeData.proposer_manager_id}`)
      }

      // Revert receiver's players back to receiver (they went to proposer, now back to receiver)
      if (receiverPlayers.length > 0) {
        const { error: revertError2 } = await supabase
          .from('rosters')
          .update({ manager_id: tradeData.receiver_manager_id })
          .in('player_id', receiverPlayers)
          .eq('season_id', activeSeason.id as number)

        if (revertError2) {
          console.error('Failed to revert receiver players:', revertError2)
          return NextResponse.json({ error: 'Failed to revert receiver players' }, { status: 500 })
        }
        console.log(`✅ Reverted ${receiverPlayers.length} receiver players back to manager ${tradeData.receiver_manager_id}`)
      }
      
      // Recalculate keeper costs for all traded players (remove trade kicker)
      const allTradedPlayers = [...proposerPlayers, ...receiverPlayers].map(id => parseInt(id))
      if (allTradedPlayers.length > 0) {
        try {
          await recalculateKeeperCosts(allTradedPlayers, activeSeason.id as number)
          console.log(`✅ Updated keeper costs for ${allTradedPlayers.length} reverted players`)
        } catch (error) {
          console.error('Failed to recalculate keeper costs after revert:', error)
          // Don't fail the revert if keeper cost update fails, just log the error
        }
      }
    }

    // Update the trade status back to pending and clear responded_at
    const { data: updatedTrade, error: updateError } = await supabase
      .from('trades')
      .update({ 
        status: 'pending',
        responded_at: null,
        impacts_season_id: null // Clear impacts since it's pending again
      })
      .eq('id', tradeId)
      .select()
      .single()

    if (updateError) {
      console.error('Database error updating trade:', updateError)
      return NextResponse.json({ error: 'Failed to update trade status', details: updateError.message }, { status: 500 })
    }

    console.log(`✅ Trade ${tradeId} successfully reverted to pending status`)

    return NextResponse.json({ 
      message: 'Trade successfully reverted to pending status',
      trade: updatedTrade 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}