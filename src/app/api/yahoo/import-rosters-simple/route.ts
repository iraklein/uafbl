import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  try {
    console.log('🚀 Starting simple Yahoo roster import (using existing data)...')

    // Step 1: Set up team mappings for your 17 managers
    const teamMappings = [
      { manager_id: 1, manager_name: 'Amish', yahoo_team_key: '466.l.5701.t.1' },
      { manager_id: 2, manager_name: 'Bier', yahoo_team_key: '466.l.5701.t.2' },
      { manager_id: 3, manager_name: 'Buchs', yahoo_team_key: '466.l.5701.t.3' },
      { manager_id: 4, manager_name: 'Emmer', yahoo_team_key: '466.l.5701.t.4' },
      { manager_id: 5, manager_name: 'Gabe', yahoo_team_key: '466.l.5701.t.5' },
      { manager_id: 17, manager_name: 'Glaspie', yahoo_team_key: '466.l.5701.t.6' },
      { manager_id: 6, manager_name: 'Haight', yahoo_team_key: '466.l.5701.t.7' },
      { manager_id: 7, manager_name: 'Horn', yahoo_team_key: '466.l.5701.t.8' },
      { manager_id: 8, manager_name: 'Jones', yahoo_team_key: '466.l.5701.t.9' },
      { manager_id: 16, manager_name: 'Kenny', yahoo_team_key: '466.l.5701.t.10' },
      { manager_id: 9, manager_name: 'Luskey', yahoo_team_key: '466.l.5701.t.11' },
      { manager_id: 10, manager_name: 'MikeMac', yahoo_team_key: '466.l.5701.t.12' },
      { manager_id: 11, manager_name: 'Mitch', yahoo_team_key: '466.l.5701.t.13' },
      { manager_id: 12, manager_name: 'Peskin', yahoo_team_key: '466.l.5701.t.14' },
      { manager_id: 13, manager_name: 'Phil', yahoo_team_key: '466.l.5701.t.15' },
      { manager_id: 14, manager_name: 'Tmac', yahoo_team_key: '466.l.5701.t.16' },
      { manager_id: 15, manager_name: 'Weeg', yahoo_team_key: '466.l.5701.t.17' }
    ]

    console.log(`📋 Setting up ${teamMappings.length} team mappings...`)

    // Update managers table with Yahoo team keys
    for (const mapping of teamMappings) {
      const { error: updateError } = await supabase
        .from('managers')
        .update({ yahoo_team_key: mapping.yahoo_team_key })
        .eq('id', mapping.manager_id)

      if (updateError) {
        console.error(`Error updating manager ${mapping.manager_name}:`, updateError)
      } else {
        console.log(`✅ ${mapping.manager_name} → ${mapping.yahoo_team_key}`)
      }
    }

    // Step 2: Create sample roster data using your existing Yahoo player mappings
    console.log('\n📊 Creating sample roster assignments...')
    
    // Get players that have Yahoo IDs
    const { data: yahooPlayers, error: playersError } = await supabase
      .from('players')
      .select('id, name, yahoo_player_id')
      .not('yahoo_player_id', 'is', null)
      .limit(50)

    if (playersError) {
      console.error('Error fetching players:', playersError)
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
    }

    console.log(`Found ${yahooPlayers.length} players with Yahoo IDs`)

    // Distribute players across teams (this is just for demonstration)
    const rosterEntries: Array<{
      team_key: string
      yahoo_player_id: string
      status: string
      raw_data: {
        player_id: string
        name: { full: string }
        demo_assignment: boolean
      }
    }> = []
    const playersPerTeam = Math.floor(yahooPlayers.length / teamMappings.length)
    
    for (let i = 0; i < teamMappings.length; i++) {
      const team = teamMappings[i]
      const startIndex = i * playersPerTeam
      const endIndex = i === teamMappings.length - 1 ? yahooPlayers.length : startIndex + playersPerTeam
      
      const teamPlayers = yahooPlayers.slice(startIndex, endIndex)
      
      for (const player of teamPlayers) {
        rosterEntries.push({
          team_key: team.yahoo_team_key,
          yahoo_player_id: String(player.yahoo_player_id || ''),
          status: 'active',
          raw_data: {
            player_id: String(player.yahoo_player_id || ''),
            name: { full: String(player.name || '') },
            demo_assignment: true
          }
        })
      }
    }

    console.log(`📝 Generated ${rosterEntries.length} roster assignments`)

    // Step 3: Clear and insert roster data
    console.log('\n🧹 Clearing existing temp data...')
    const { error: deleteError } = await supabase
      .from('yahoo_rosters_temp')
      .delete()
      .like('team_key', '466.l.5701%')

    if (deleteError) {
      console.error('Error clearing temp table:', deleteError)
    } else {
      console.log('✅ Cleared existing data')
    }

    console.log('💾 Inserting roster assignments...')
    const batchSize = 50
    let insertedCount = 0

    for (let i = 0; i < rosterEntries.length; i += batchSize) {
      const batch = rosterEntries.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('yahoo_rosters_temp')
        .insert(batch)

      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError.message)
      } else {
        insertedCount += batch.length
        console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} entries`)
      }
    }

    // Step 4: Generate summary
    console.log('\n📊 Generating summary...')
    const { data: summaryData, error: summaryError } = await supabase
      .from('yahoo_rosters_temp')
      .select('team_key, yahoo_player_id')

    const teamSummary: Record<string, number> = {}
    summaryData?.forEach(entry => {
      const teamKey = String(entry.team_key || '')
      if (!teamSummary[teamKey]) {
        teamSummary[teamKey] = 0
      }
      teamSummary[teamKey]++
    })

    console.log('✅ Simple Yahoo roster import completed!')

    return NextResponse.json({
      success: true,
      message: 'Yahoo roster assignments created successfully!',
      note: 'This is a demonstration using existing Yahoo player mappings',
      summary: {
        teams_mapped: teamMappings.length,
        players_used: yahooPlayers.length,
        roster_entries_created: insertedCount,
        teams_summary: teamSummary
      },
      team_mappings: teamMappings.map(t => ({
        manager: t.manager_name,
        yahoo_team_key: t.yahoo_team_key
      }))
    })

  } catch (error) {
    console.error('Simple roster import error:', error)
    return NextResponse.json({ 
      error: 'Failed to create roster assignments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to show current assignments
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    // Get roster summary with manager and player names
    const { data: rosterData, error: rosterError } = await supabase
      .from('yahoo_rosters_temp')
      .select('team_key, yahoo_player_id, status, imported_at')
      .order('team_key')

    if (rosterError) {
      return NextResponse.json({ error: 'Failed to fetch roster data' }, { status: 500 })
    }

    // Get manager mappings
    const { data: managers, error: managersError } = await supabase
      .from('managers')
      .select('id, manager_name, yahoo_team_key')
      .not('yahoo_team_key', 'is', null)
      .order('manager_name')

    // Get player names for Yahoo IDs
    const yahooIds = [...new Set(rosterData?.map(r => r.yahoo_player_id) || [])]
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, yahoo_player_id')
      .in('yahoo_player_id', yahooIds)

    // Create lookup maps
    const managerMap: Record<string, string> = {}
    const playerMap: Record<string, string> = {}
    
    managers?.forEach(m => {
      if (m.yahoo_team_key) {
        managerMap[String(m.yahoo_team_key)] = String(m.manager_name)
      }
    })
    players?.forEach(p => {
      if (p.yahoo_player_id) {
        playerMap[String(p.yahoo_player_id)] = String(p.name)
      }
    })

    // Build team summary
    const teamSummary: Record<string, any> = {}
    rosterData?.forEach(entry => {
      const teamKey = String(entry.team_key || '')
      const managerName = managerMap[teamKey] || 'Unknown Manager'
      const playerName = playerMap[String(entry.yahoo_player_id || '')] || 'Unknown Player'
      
      if (!teamSummary[teamKey]) {
        teamSummary[teamKey] = {
          manager: managerName,
          players: []
        }
      }
      
      teamSummary[teamKey].players.push({
        name: playerName,
        yahoo_id: entry.yahoo_player_id,
        status: entry.status
      })
    })

    return NextResponse.json({
      status: 'ready',
      total_roster_entries: rosterData?.length || 0,
      managers_mapped: managers?.length || 0,
      teams: Object.keys(teamSummary).length,
      team_summary: teamSummary,
      managers_with_team_keys: managers
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}