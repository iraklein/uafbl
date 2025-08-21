import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function POST() {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log('Updating T.J. Warren draft record to move to Gabe\'s team for $6...')
    
    // Update the existing draft record (ID: 18824)
    // Change from Weeg (manager_id: 15, $8) to Gabe (manager_id: 5, $6)
    const { data: updatedRecord, error: updateError } = await supabase
      .from('draft_results')
      .update({
        manager_id: 5, // Gabe's ID
        draft_price: 6 // New price
      })
      .eq('id', 18824)
      .eq('player_id', 378)
      .eq('season_id', 16)
      .select('*')
      .single()
    
    if (updateError) {
      console.error('Error updating draft record:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    
    console.log('Successfully updated T.J. Warren draft record')
    
    return NextResponse.json({
      success: true,
      message: 'Successfully updated T.J. Warren\'s draft record - moved from Weeg to Gabe for $6',
      updatedRecord: updatedRecord,
      changes: {
        from: 'Weeg (ID: 15) for $8',
        to: 'Gabe (ID: 5) for $6'
      },
      details: {
        player: 'T.J. Warren (ID: 378)',
        season: '2021 (ID: 16)',
        recordId: 18824,
        newManager: 'Gabe (ID: 5)',
        newPrice: '$6'
      }
    })
    
  } catch (error) {
    console.error('Error updating T.J. Warren draft record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}