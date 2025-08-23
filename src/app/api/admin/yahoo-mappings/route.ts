import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    // Get all mappings with joined UAFBL player names
    const { data, error } = await supabase
      .from('yahoo_player_mappings')
      .select(`
        *,
        uafbl_player_name:players(name)
      `)
      .order('yahoo_name_full', { ascending: true })

    if (error) {
      console.error('Error fetching mappings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to flatten the player name
    const mappings = data.map(mapping => ({
      ...mapping,
      uafbl_player_name: mapping.uafbl_player_name?.name || null
    }))

    return NextResponse.json({ mappings })

  } catch (error) {
    console.error('Error in yahoo-mappings GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}