import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function POST() {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log('Adding John Wall draft record for Mitch in 2021...')
    
    // John Wall player ID: 1001
    // 2021 season ID: 16 
    // Mitch manager ID: 11 (from managers table)
    
    // First, check if John Wall already has a draft record for 2021
    const { data: existingDraft } = await supabase
      .from('draft_results')
      .select('*')
      .eq('player_id', 1001)
      .eq('season_id', 16)
    
    if (existingDraft && existingDraft.length > 0) {
      return NextResponse.json({ 
        error: 'John Wall already has a draft record for 2021',
        existing: existingDraft[0]
      }, { status: 400 })
    }
    
    const mitch = { id: 11, manager_name: 'Mitch' }
    console.log(`Adding John Wall to ${mitch.manager_name}'s team for $1`)
    
    // Create the draft record
    const { data: draftRecord, error: draftError } = await supabase
      .from('draft_results')
      .insert([{
        player_id: 1001,
        season_id: 16,
        draft_price: 1,
        manager_id: mitch.id,
        is_keeper: false
      }])
      .select('*')
      .single()
    
    if (draftError) {
      console.error('Error creating draft record:', draftError)
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }
    
    console.log('Successfully created John Wall draft record')
    
    return NextResponse.json({
      success: true,
      message: `Successfully created draft record for John Wall on ${mitch.manager_name}'s team for 2021 season`,
      draftRecord: draftRecord,
      details: {
        player: 'John Wall (ID: 1001)',
        season: '2021 (ID: 16)', 
        manager: `${mitch.manager_name} (ID: ${mitch.id})`,
        price: '$1',
        isKeeper: false
      }
    })
    
  } catch (error) {
    console.error('Error adding John Wall draft record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}