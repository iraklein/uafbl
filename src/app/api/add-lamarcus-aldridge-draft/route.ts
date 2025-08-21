import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function POST() {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log('Adding LaMarcus Aldridge draft record for Jones in 2021...')
    
    // LaMarcus Aldridge player ID: 6
    // 2021 season ID: 16 
    // Jones manager ID: 8 (from managers table)
    
    // First, check if LaMarcus Aldridge already has a draft record for 2021
    const { data: existingDraft } = await supabase
      .from('draft_results')
      .select('*')
      .eq('player_id', 6)
      .eq('season_id', 16)
    
    if (existingDraft && existingDraft.length > 0) {
      return NextResponse.json({ 
        error: 'LaMarcus Aldridge already has a draft record for 2021',
        existing: existingDraft[0]
      }, { status: 400 })
    }
    
    const jones = { id: 8, manager_name: 'Jones' }
    console.log(`Adding LaMarcus Aldridge to ${jones.manager_name}'s team for $1`)
    
    // Create the draft record
    const { data: draftRecord, error: draftError } = await supabase
      .from('draft_results')
      .insert([{
        player_id: 6,
        season_id: 16,
        draft_price: 1,
        manager_id: jones.id,
        is_keeper: false
      }])
      .select('*')
      .single()
    
    if (draftError) {
      console.error('Error creating draft record:', draftError)
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }
    
    console.log('Successfully created LaMarcus Aldridge draft record')
    
    return NextResponse.json({
      success: true,
      message: `Successfully created draft record for LaMarcus Aldridge on ${jones.manager_name}'s team for 2021 season`,
      draftRecord: draftRecord,
      details: {
        player: 'LaMarcus Aldridge (ID: 6)',
        season: '2021 (ID: 16)', 
        manager: `${jones.manager_name} (ID: ${jones.id})`,
        price: '$1',
        isKeeper: false
      }
    })
    
  } catch (error) {
    console.error('Error adding LaMarcus Aldridge draft record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}