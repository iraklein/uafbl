import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  try {
    const { season_id, player_id, notes } = await request.json()

    if (!season_id || !player_id) {
      return NextResponse.json({ error: 'Season ID and Player ID are required' }, { status: 400 })
    }

    // Insert the trade
    const { data, error } = await supabase
      .from('trades')
      .insert({
        season_id,
        player_id,
        notes
      })
      .select('id')
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to add trade' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Trade added successfully',
      trade_id: data.id 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  try {
    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('season_id')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    // Fetch trades for the season with player and season details
    const { data: trades, error } = await supabase
      .from('trades')
      .select(`
        id,
        season_id,
        player_id,
        notes,
        created_at,
        players (
          id,
          name
        ),
        seasons (
          id,
          name,
          year
        )
      `)
      .eq('season_id', seasonId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
    }

    return NextResponse.json(trades || [])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}