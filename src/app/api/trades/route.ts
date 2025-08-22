import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  try {
    const body = await request.json()
    const { 
      season_id, 
      proposer_manager_id, 
      receiver_manager_id, 
      proposer_cash = 0, 
      proposer_slots = 0, 
      receiver_cash = 0, 
      receiver_slots = 0
    } = body

    if (!season_id || !proposer_manager_id || !receiver_manager_id) {
      return NextResponse.json({ 
        error: 'Season ID, proposer manager ID, and receiver manager ID are required' 
      }, { status: 400 })
    }

    // Insert the trade proposal
    const { data, error } = await supabase
      .from('trades')
      .insert({
        season_id,
        proposer_manager_id,
        receiver_manager_id,
        proposer_cash,
        proposer_slots,
        receiver_cash,
        receiver_slots,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create trade proposal' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Trade proposal created successfully',
      trade: data 
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

    // Fetch trades for the season with manager details
    const { data: trades, error } = await supabase
      .from('trades')
      .select(`
        id,
        season_id,
        proposer_manager_id,
        receiver_manager_id,
        proposer_cash,
        proposer_slots,
        proposer_players,
        receiver_cash,
        receiver_slots,
        receiver_players,
        status,
        created_at,
        responded_at,
        proposer:managers!proposer_manager_id (
          id,
          manager_name
        ),
        receiver:managers!receiver_manager_id (
          id,
          manager_name
        )
      `)
      .eq('season_id', seasonId)
      .in('status', ['accepted', 'pending'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
    }

    // Enrich player data with names
    const enrichedTrades = await Promise.all((trades || []).map(async (trade) => {
      const enrichedTrade = { ...trade }
      
      // Fetch proposer player names
      if (trade.proposer_players && Array.isArray(trade.proposer_players) && trade.proposer_players.length > 0) {
        const { data: proposerPlayers } = await supabase
          .from('players')
          .select('id, name')
          .in('id', trade.proposer_players)
        
        enrichedTrade.proposer_players = proposerPlayers || []
      }
      
      // Fetch receiver player names
      if (trade.receiver_players && Array.isArray(trade.receiver_players) && trade.receiver_players.length > 0) {
        const { data: receiverPlayers } = await supabase
          .from('players')
          .select('id, name')
          .in('id', trade.receiver_players)
        
        enrichedTrade.receiver_players = receiverPlayers || []
      }
      
      return enrichedTrade
    }))

    return NextResponse.json(enrichedTrades)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}