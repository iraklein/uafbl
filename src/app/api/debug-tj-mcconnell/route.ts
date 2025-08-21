import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()
  
  try {
    const tjPlayerIds = [448, 5098]
    
    // Get draft records for both T.J. McConnell players
    const { data: draftRecords, error: draftError } = await supabase
      .from('draft_results')
      .select('*')
      .in('player_id', tjPlayerIds)
      .order('season_id', { ascending: true })
    
    if (draftError) {
      return NextResponse.json({ error: draftError.message }, { status: 500 })
    }
    
    // Group by season to find conflicts
    const recordsBySeasonPlayer = new Map()
    const conflicts: any[] = []
    
    for (const record of draftRecords || []) {
      const key = `${record.season_id}_${record.player_id}`
      recordsBySeasonPlayer.set(key, record)
      
      // Check for conflicts within same season
      const season = record.season_id
      const otherPlayerId = tjPlayerIds.find(id => id !== record.player_id)
      const conflictKey = `${season}_${otherPlayerId}`
      
      if (recordsBySeasonPlayer.has(conflictKey)) {
        conflicts.push({
          season_id: season,
          player_448_record: record.player_id === 448 ? record : recordsBySeasonPlayer.get(conflictKey),
          player_5098_record: record.player_id === 5098 ? record : recordsBySeasonPlayer.get(conflictKey)
        })
      }
    }
    
    return NextResponse.json({
      message: `Found ${draftRecords?.length || 0} draft records for T.J. McConnell players`,
      player_448_records: draftRecords?.filter(r => r.player_id === 448) || [],
      player_5098_records: draftRecords?.filter(r => r.player_id === 5098) || [],
      conflicts: conflicts,
      all_records: draftRecords || []
    })
    
  } catch (error) {
    console.error('Error in debug T.J. McConnell:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}