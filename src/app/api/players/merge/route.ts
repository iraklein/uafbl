import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const body = await request.json()
    const { sourceIds, targetId } = body
    
    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return NextResponse.json({ error: 'sourceIds array is required' }, { status: 400 })
    }
    
    if (!targetId || typeof targetId !== 'number') {
      return NextResponse.json({ error: 'targetId is required and must be a number' }, { status: 400 })
    }
    
    console.log(`Starting merge of players ${sourceIds.join(', ')} into ${targetId}`)
    
    // Get target player info
    const { data: targetPlayer, error: targetError } = await supabase
      .from('players')
      .select('id, name')
      .eq('id', targetId)
      .single()
    
    if (targetError || !targetPlayer) {
      return NextResponse.json({ error: 'Target player not found' }, { status: 404 })
    }
    
    // Get source players info
    const { data: sourcePlayers, error: sourceError } = await supabase
      .from('players')
      .select('id, name')
      .in('id', sourceIds)
    
    if (sourceError) {
      return NextResponse.json({ error: sourceError.message }, { status: 500 })
    }
    
    if (!sourcePlayers || sourcePlayers.length !== sourceIds.length) {
      return NextResponse.json({ error: 'Some source players not found' }, { status: 404 })
    }
    
    console.log(`Target player: ${targetPlayer.name} (${targetPlayer.id})`)
    console.log(`Source players: ${sourcePlayers.map(p => `${p.name} (${p.id})`).join(', ')}`)
    
    // Update all referencing tables
    for (const sourceId of sourceIds) {
      // Update draft_results table
      const { error: draftError } = await supabase
        .from('draft_results')
        .update({ player_id: targetId })
        .eq('player_id', sourceId)
      
      if (draftError) {
        console.error(`Error updating draft_results for player ${sourceId}:`, draftError)
        return NextResponse.json({ error: `Failed to update draft_results: ${draftError.message}` }, { status: 500 })
      }
      
      // Update toppers table
      const { error: toppersError } = await supabase
        .from('toppers')
        .update({ player_id: targetId })
        .eq('player_id', sourceId)
      
      if (toppersError) {
        console.error(`Error updating toppers for player ${sourceId}:`, toppersError)
        return NextResponse.json({ error: `Failed to update toppers: ${toppersError.message}` }, { status: 500 })
      }
      
      // Update lsl table
      const { error: lslError } = await supabase
        .from('lsl')
        .update({ player_id: targetId })
        .eq('player_id', sourceId)
      
      if (lslError) {
        console.error(`Error updating lsl for player ${sourceId}:`, lslError)
        return NextResponse.json({ error: `Failed to update lsl: ${lslError.message}` }, { status: 500 })
      }
      
      // Update rosters table
      const { error: rostersError } = await supabase
        .from('rosters')
        .update({ player_id: targetId })
        .eq('player_id', sourceId)
      
      if (rostersError) {
        console.error(`Error updating rosters for player ${sourceId}:`, rostersError)
        return NextResponse.json({ error: `Failed to update rosters: ${rostersError.message}` }, { status: 500 })
      }
      
      // Update trades table
      const { error: tradesError } = await supabase
        .from('trades')
        .update({ player_id: targetId })
        .eq('player_id', sourceId)
      
      if (tradesError) {
        console.error(`Error updating trades for player ${sourceId}:`, tradesError)
        return NextResponse.json({ error: `Failed to update trades: ${tradesError.message}` }, { status: 500 })
      }
    }
    
    // Delete source players
    for (const sourceId of sourceIds) {
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', sourceId)
      
      if (deleteError) {
        console.error(`Error deleting player ${sourceId}:`, deleteError)
        return NextResponse.json({ error: `Failed to delete player ${sourceId}: ${deleteError.message}` }, { status: 500 })
      }
    }
    
    console.log(`Successfully merged ${sourceIds.length} players into player ${targetId}`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully merged ${sourceIds.length} players into player ${targetId} with name "${targetPlayer.name}"`
    })
    
  } catch (error) {
    console.error('Error in merge operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}