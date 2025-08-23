import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase'

export async function PUT(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Remove the UAFBL player mapping
    const { error } = await supabase
      .from('yahoo_player_mappings')
      .update({ 
        uafbl_player_id: null,
        is_verified: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error unmapping player:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Player unmapped successfully' })

  } catch (error) {
    console.error('Error in unmap operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}