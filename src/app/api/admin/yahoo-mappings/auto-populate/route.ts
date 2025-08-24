import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const body = await request.json()
    const { playerId, yahooPlayerId } = body
    
    if (!playerId || !yahooPlayerId) {
      return NextResponse.json({ error: 'playerId and yahooPlayerId are required' }, { status: 400 })
    }
    
    console.log(`🔄 Auto-populating Yahoo data for player ${playerId} with Yahoo ID ${yahooPlayerId}`)
    
    // Load Yahoo processed data
    const yahooDataPath = path.join(process.cwd(), 'yahoo-players-processed.json')
    
    if (!fs.existsSync(yahooDataPath)) {
      return NextResponse.json({ error: 'Yahoo data file not found' }, { status: 500 })
    }
    
    const yahooData = JSON.parse(fs.readFileSync(yahooDataPath, 'utf8'))
    const yahooPlayer = yahooData.players.find((p: any) => p.yahoo_player_id === yahooPlayerId)
    
    if (!yahooPlayer) {
      return NextResponse.json({ error: `Yahoo player not found for ID ${yahooPlayerId}` }, { status: 404 })
    }
    
    // Get current player data
    const { data: currentPlayer, error: fetchError } = await supabase
      .from('players')
      .select('id, name, data_source')
      .eq('id', playerId)
      .single()
    
    if (fetchError || !currentPlayer) {
      return NextResponse.json({ error: 'Player not found in database' }, { status: 404 })
    }
    
    // Update player with complete Yahoo data
    const { error: updateError } = await supabase
      .from('players')
      .update({
        yahoo_player_id: yahooPlayerId,
        yahoo_name_full: yahooPlayer.yahoo_name_full,
        yahoo_name_first: yahooPlayer.yahoo_first_name,
        yahoo_name_last: yahooPlayer.yahoo_last_name,
        yahoo_team_abbr: yahooPlayer.yahoo_team_abbr,
        yahoo_positions: yahooPlayer.yahoo_positions,
        yahoo_player_key: yahooPlayer.yahoo_player_key,
        yahoo_matched_at: new Date().toISOString(),
        data_source: currentPlayer.data_source === 'uafbl' ? 'multi' : 
                    currentPlayer.data_source === 'bbm' ? 'multi' : 'yahoo'
      })
      .eq('id', playerId)
    
    if (updateError) {
      return NextResponse.json({ error: `Failed to update player: ${updateError.message}` }, { status: 500 })
    }
    
    console.log(`✅ Successfully auto-populated Yahoo data for ${currentPlayer.name}`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully populated Yahoo data for ${currentPlayer.name}`,
      yahooData: {
        yahoo_name_full: yahooPlayer.yahoo_name_full,
        yahoo_team_abbr: yahooPlayer.yahoo_team_abbr,
        yahoo_positions: yahooPlayer.yahoo_positions,
        yahoo_player_key: yahooPlayer.yahoo_player_key
      }
    })
    
  } catch (error) {
    console.error('Error in auto-populate Yahoo data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}