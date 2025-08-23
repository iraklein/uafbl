import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase'

export async function PUT(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const body = await request.json()
    const { id, uafbl_player_id } = body

    if (!id || !uafbl_player_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update the mapping and mark as verified since it's manually created
    const { error } = await supabase
      .from('yahoo_player_mappings')
      .update({ 
        uafbl_player_id,
        is_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating mapping:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Mapping updated successfully' })

  } catch (error) {
    console.error('Error in mapping update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}