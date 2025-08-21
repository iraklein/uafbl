import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function POST() {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log('Adding T.J. Warren draft record for Gabe in 2021...')
    
    // T.J. Warren player ID: 378
    // 2021 season ID: 16 
    // Gabe's manager ID: 5 (from managers table)
    
    // First, check if T.J. Warren already has a draft record for 2021
    const { data: existingDraft } = await supabase
      .from('draft_results')
      .select('*')
      .eq('player_id', 378)
      .eq('season_id', 16)
    
    if (existingDraft && existingDraft.length > 0) {
      return NextResponse.json({ 
        error: 'T.J. Warren already has a draft record for 2021',
        existing: existingDraft[0]
      }, { status: 400 })
    }
    
    const gabe = { id: 5, manager_name: 'Gabe' }
    console.log(`Adding T.J. Warren to ${gabe.manager_name}'s team`)
    
    // Create the draft record (no price specified, will ask user)
    const { data: draftRecord, error: draftError } = await supabase
      .from('draft_results')
      .insert([{
        player_id: 378,
        season_id: 16,
        draft_price: 1, // Default to $1, user can specify if different
        manager_id: gabe.id,
        is_keeper: false
      }])
      .select('*')
      .single()
    
    if (draftError) {
      console.error('Error creating draft record:', draftError)
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }
    
    console.log('Successfully created T.J. Warren draft record')
    
    return NextResponse.json({
      success: true,
      message: `Successfully created draft record for T.J. Warren on ${gabe.manager_name}'s team for 2021 season`,
      draftRecord: draftRecord,
      details: {
        player: 'T.J. Warren (ID: 378)',
        season: '2021 (ID: 16)', 
        manager: `${gabe.manager_name} (ID: ${gabe.id})`,
        price: '$1',
        isKeeper: false
      }
    })
    
  } catch (error) {
    console.error('Error adding T.J. Warren draft record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}