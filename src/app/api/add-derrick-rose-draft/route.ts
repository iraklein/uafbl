import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function POST() {
  const supabase = createServerSupabaseClient()
  
  try {
    console.log('Adding Derrick Rose draft record for Glaspie in 2019...')
    
    // Derrick Rose player ID: 13
    // 2019 season ID: 14 (from our previous check)
    // Glaspie's manager ID: Need to find this
    
    // First, let's check if Derrick Rose already has a draft record for 2019
    const { data: existingDraft } = await supabase
      .from('draft_results')
      .select('*')
      .eq('player_id', 13)
      .eq('season_id', 14)
    
    if (existingDraft && existingDraft.length > 0) {
      return NextResponse.json({ 
        error: 'Derrick Rose already has a draft record for 2019',
        existing: existingDraft[0]
      }, { status: 400 })
    }
    
    // Glaspie's manager ID is 17 based on managers table
    const glaspie = { id: 17, manager_name: 'Glaspie' }
    
    console.log(`Found Glaspie: ID ${glaspie.id}, Name: ${glaspie.manager_name}`)
    
    // Create the draft record
    const { data: draftRecord, error: draftError } = await supabase
      .from('draft_results')
      .insert([{
        player_id: 13,
        season_id: 14,
        draft_price: 2,
        manager_id: glaspie.id,
        is_keeper: false
      }])
      .select('*')
      .single()
    
    if (draftError) {
      console.error('Error creating draft record:', draftError)
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }
    
    console.log('Successfully created Derrick Rose draft record')
    
    return NextResponse.json({
      success: true,
      message: `Successfully created draft record for Derrick Rose on ${glaspie.manager_name}'s team for 2019 season`,
      draftRecord: draftRecord,
      details: {
        player: 'Derrick Rose (ID: 13)',
        season: '2019 (ID: 14)',
        manager: `${glaspie.manager_name} (ID: ${glaspie.id})`,
        price: '$2',
        isKeeper: false
      }
    })
    
  } catch (error) {
    console.error('Error adding Derrick Rose draft record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}