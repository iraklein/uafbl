import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const { searchParams } = new URL(request.url)
    const seasonFilter = searchParams.get('season_id')
    
    // Get all players using pagination to avoid 1000-row limit
    let allPlayers: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true
    
    while (hasMore) {
      let players, error
      
      if (seasonFilter) {
        // Get only players on rosters for the specified season
        const result = await supabase
          .from('players')
          .select(`
            id, name, bbm_id, bbm_name, bbm_verified, data_source, bbm_matched_at, notes, 
            yahoo_player_id, yahoo_player_key, yahoo_name_full, yahoo_positions, yahoo_team_abbr, yahoo_verified, yahoo_matched_at,
            rosters!inner(season_id, manager_id, managers(manager_name))
          `)
          .eq('rosters.season_id', parseInt(seasonFilter))
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('name')
        
        players = result.data
        error = result.error
      } else {
        // Get all players (no roster filter)
        const result = await supabase
          .from('players')
          .select('id, name, bbm_id, bbm_name, bbm_verified, data_source, bbm_matched_at, notes, yahoo_player_id, yahoo_player_key, yahoo_name_full, yahoo_positions, yahoo_team_abbr, yahoo_verified, yahoo_matched_at')
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('name')
        
        players = result.data
        error = result.error
      }
      
      if (error) {
        console.error('Error fetching players:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      allPlayers = [...allPlayers, ...players]
      hasMore = players && players.length === pageSize
      page++
    }
    
    // Filter players by mapping status
    const bbmMapped = allPlayers.filter(p => p.bbm_id)
    const bbmUnmapped = allPlayers.filter(p => !p.bbm_id)
    const yahooMapped = allPlayers.filter(p => p.yahoo_player_id)
    const yahooUnmapped = allPlayers.filter(p => !p.yahoo_player_id)
    const fullyMapped = allPlayers.filter(p => p.bbm_id && p.yahoo_player_id)
    const partiallyMapped = allPlayers.filter(p => (p.bbm_id && !p.yahoo_player_id) || (!p.bbm_id && p.yahoo_player_id))
    const unmapped = allPlayers.filter(p => !p.bbm_id && !p.yahoo_player_id)
    
    return NextResponse.json({
      players: allPlayers,
      stats: {
        total: allPlayers.length,
        bbm: {
          mapped: bbmMapped.length,
          unmapped: bbmUnmapped.length
        },
        yahoo: {
          mapped: yahooMapped.length,
          unmapped: yahooUnmapped.length
        },
        combined: {
          fullyMapped: fullyMapped.length,
          partiallyMapped: partiallyMapped.length,
          unmapped: unmapped.length
        }
      }
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}