import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase'

export async function PUT(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const body = await request.json()
    const { playerId } = body
    
    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }
    
    // Remove BBM mapping
    const { data, error } = await supabase
      .from('players')
      .update({
        bbm_id: null,
        bbm_name: null,
        bbm_verified: false,
        data_source: 'uafbl',
        bbm_matched_at: null,
        notes: 'BBM mapping removed via admin panel'
      })
      .eq('id', playerId)
      .select()
    
    if (error) {
      console.error('Error removing BBM mapping:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, data })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}