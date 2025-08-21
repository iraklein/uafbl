import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function POST() {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log('Starting remaining duplicates resolution...')
    
    // 1. Fix Walt Lemon conflict (season 14)
    console.log('Fixing Walt Lemon duplicate draft record...')
    const { error: deleteWaltError } = await supabase
      .from('draft_results')
      .delete()
      .eq('id', 18795) // Later duplicate for player 1010
    
    if (deleteWaltError) {
      console.error('Error deleting Walt Lemon duplicate draft record:', deleteWaltError)
      return NextResponse.json({ error: `Failed to delete Walt Lemon duplicate: ${deleteWaltError.message}` }, { status: 500 })
    }
    
    console.log('Successfully deleted Walt Lemon duplicate draft record')
    
    // 2. Merge Walt Lemon (543 -> 1010)
    console.log('Merging Walt Lemon players...')
    await mergePlayer(supabase, [543], 1010, 'Walt Lemon Jr.')
    
    // 3. Merge GG Jackson (605 -> 6748) - check for conflicts first
    console.log('Merging GG Jackson players...')
    await mergePlayer(supabase, [605], 6748, 'G.G. Jackson')
    
    // 4. Merge Ron Holland (608 -> 6938) - check for conflicts first  
    console.log('Merging Ron Holland players...')
    await mergePlayer(supabase, [608], 6938, 'Ron Holland')
    
    return NextResponse.json({
      success: true,
      message: 'Successfully resolved all remaining duplicate conflicts and merged players',
      merged: [
        'Walt Lemon (543) -> Walt Lemon Jr. (1010)',
        'GG Jackson II (605) -> G.G. Jackson (6748)',
        'Ron Holland II (608) -> Ron Holland (6938)'
      ]
    })
    
  } catch (error) {
    console.error('Error in remaining duplicates fix:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function mergePlayer(supabase: any, sourceIds: number[], targetId: number, targetName: string) {
  console.log(`Starting merge of players ${sourceIds.join(', ')} into ${targetId} (${targetName})`)
  
  // Update all referencing tables
  for (const sourceId of sourceIds) {
    // Update draft_results table
    const { error: draftError } = await supabase
      .from('draft_results')
      .update({ player_id: targetId })
      .eq('player_id', sourceId)
    
    if (draftError) {
      throw new Error(`Failed to update draft_results for player ${sourceId}: ${draftError.message}`)
    }
    
    // Update toppers table
    const { error: toppersError } = await supabase
      .from('toppers')
      .update({ player_id: targetId })
      .eq('player_id', sourceId)
    
    if (toppersError) {
      throw new Error(`Failed to update toppers for player ${sourceId}: ${toppersError.message}`)
    }
    
    // Update lsl table
    const { error: lslError } = await supabase
      .from('lsl')
      .update({ player_id: targetId })
      .eq('player_id', sourceId)
    
    if (lslError) {
      throw new Error(`Failed to update lsl for player ${sourceId}: ${lslError.message}`)
    }
    
    // Update rosters table
    const { error: rostersError } = await supabase
      .from('rosters')
      .update({ player_id: targetId })
      .eq('player_id', sourceId)
    
    if (rostersError) {
      throw new Error(`Failed to update rosters for player ${sourceId}: ${rostersError.message}`)
    }
    
    // Update trades table
    const { error: tradesError } = await supabase
      .from('trades_old')
      .update({ player_id: targetId })
      .eq('player_id', sourceId)
    
    if (tradesError) {
      throw new Error(`Failed to update trades for player ${sourceId}: ${tradesError.message}`)
    }
  }
  
  // Delete source players
  for (const sourceId of sourceIds) {
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', sourceId)
    
    if (deleteError) {
      throw new Error(`Failed to delete player ${sourceId}: ${deleteError.message}`)
    }
  }
  
  console.log(`Successfully merged ${sourceIds.length} players into ${targetId} (${targetName})`)
}