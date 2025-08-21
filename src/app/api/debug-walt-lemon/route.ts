import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()
  
  try {
    const waltPlayerIds = [543, 1010]
    
    // Get draft records for both Walt Lemon players
    const { data: draftRecords, error: draftError } = await supabase
      .from('draft_results')
      .select('*')
      .in('player_id', waltPlayerIds)
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
      const otherPlayerId = waltPlayerIds.find(id => id !== record.player_id)
      const conflictKey = `${season}_${otherPlayerId}`
      
      if (recordsBySeasonPlayer.has(conflictKey)) {
        conflicts.push({
          season_id: season,
          player_543_record: record.player_id === 543 ? record : recordsBySeasonPlayer.get(conflictKey),
          player_1010_record: record.player_id === 1010 ? record : recordsBySeasonPlayer.get(conflictKey)
        })
      }
    }
    
    return NextResponse.json({
      message: `Found ${draftRecords?.length || 0} draft records for Walt Lemon players`,
      player_543_records: draftRecords?.filter(r => r.player_id === 543) || [],
      player_1010_records: draftRecords?.filter(r => r.player_id === 1010) || [],
      conflicts: conflicts,
      all_records: draftRecords || []
    })
    
  } catch (error) {
    console.error('Error in debug Walt Lemon:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}