import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../../lib/supabase'
import fs from 'fs'
import path from 'path'

// Load BBM data for auto-filling names
function loadBBMData() {
  try {
    const bbmDataPath = path.join(process.cwd(), 'bbm-players-processed.json')
    if (fs.existsSync(bbmDataPath)) {
      const bbmData = JSON.parse(fs.readFileSync(bbmDataPath, 'utf8'))
      const bbmLookup = new Map()
      bbmData.players.forEach((player: any) => {
        bbmLookup.set(player.bbm_id, player.bbm_name)
      })
      return bbmLookup
    }
  } catch (error) {
    console.error('Error loading BBM data:', error)
  }
  return new Map()
}

export async function PUT(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const body = await request.json()
    const { playerId, bbmId, bbmName, verified, yahooPlayerId, yahooPlayerKey, yahooNameFull, yahooPositions, yahooTeamAbbr, yahooVerified } = body
    
    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }
    
    const updateData: any = {}
    
    // Handle BBM data updates
    if (bbmId !== undefined) {
      updateData.bbm_id = bbmId || null
      
      // Auto-fill BBM name if BBM ID is provided and name is empty
      if (bbmId && !bbmName) {
        const bbmLookup = loadBBMData()
        const autoFillName = bbmLookup.get(parseInt(bbmId))
        updateData.bbm_name = autoFillName || null
        console.log(`Auto-filled BBM name for ID ${bbmId}: ${autoFillName}`)
      } else {
        updateData.bbm_name = bbmName || null
      }
      
      updateData.bbm_verified = verified || false
      updateData.bbm_matched_at = bbmId ? new Date().toISOString() : null
      if (!updateData.notes) updateData.notes = bbmId ? 'BBM mapping updated via admin panel' : 'BBM mapping removed via admin panel'
    }
    
    // Handle Yahoo data updates
    if (yahooPlayerId !== undefined) {
      updateData.yahoo_player_id = yahooPlayerId || null
      updateData.yahoo_player_key = yahooPlayerKey || null
      updateData.yahoo_name_full = yahooNameFull || null
      updateData.yahoo_positions = yahooPositions || null
      updateData.yahoo_team_abbr = yahooTeamAbbr || null
      updateData.yahoo_verified = yahooVerified || false
      updateData.yahoo_matched_at = yahooPlayerId ? new Date().toISOString() : null
      updateData.yahoo_updated_at = new Date().toISOString()
      if (!updateData.notes) updateData.notes = yahooPlayerId ? 'Yahoo mapping updated via admin panel' : 'Yahoo mapping removed via admin panel'
    }
    
    // Update data source based on mappings
    if (bbmId && yahooPlayerId) {
      updateData.data_source = 'multi'
    } else if (bbmId) {
      updateData.data_source = 'bbm'
    } else if (yahooPlayerId) {
      updateData.data_source = 'yahoo'
    } else {
      updateData.data_source = 'uafbl'
    }
    
    const { data, error } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', playerId)
      .select()
    
    if (error) {
      console.error('Error updating player BBM mapping:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, data })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}