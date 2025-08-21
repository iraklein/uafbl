import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function POST() {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log('Starting T.J. McConnell conflict resolution...')
    
    // Step 1: Delete the duplicate draft record for player 5098 in season 16
    // This is the later-created duplicate (ID 18822)
    const { error: deleteError } = await supabase
      .from('draft_results')
      .delete()
      .eq('id', 18822)
    
    if (deleteError) {
      console.error('Error deleting duplicate draft record:', deleteError)
      return NextResponse.json({ error: `Failed to delete duplicate draft record: ${deleteError.message}` }, { status: 500 })
    }
    
    console.log('Successfully deleted duplicate draft record (ID 18822)')
    
    // Step 2: Now proceed with the merge using the existing merge logic
    const sourceIds = [448]
    const targetId = 5098
    
    console.log(`Starting merge of players ${sourceIds.join(', ')} into ${targetId}`)
    
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
    
    // Step 3: Delete source players
    for (const sourceId of sourceIds) {
      const { error: deletePlayerError } = await supabase
        .from('players')
        .delete()
        .eq('id', sourceId)
      
      if (deletePlayerError) {
        console.error(`Error deleting player ${sourceId}:`, deletePlayerError)
        return NextResponse.json({ error: `Failed to delete player ${sourceId}: ${deletePlayerError.message}` }, { status: 500 })
      }
    }
    
    console.log(`Successfully merged ${sourceIds.length} players into player ${targetId}`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully resolved T.J. McConnell conflict and merged ${sourceIds.length} players into player ${targetId}`,
      actions: [
        'Deleted duplicate draft record (ID 18822) for player 5098 in 2021-22 season',
        'Updated all referencing tables to point player 448 records to player 5098', 
        'Deleted duplicate player 448',
        'T.J. McConnell (ID 5098) now contains all historical data'
      ]
    })
    
  } catch (error) {
    console.error('Error in T.J. McConnell fix:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}