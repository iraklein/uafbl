import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('yahoo_access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Yahoo' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()

  try {
    const leagueKey = '466.l.5701' // Urban Achievers league key
    console.log('🚀 Starting Yahoo roster import for league:', leagueKey)

    // Step 1: Get all teams in the league
    console.log('📋 Fetching teams from Yahoo...')
    const teamsResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/teams?format=json`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'UAFBL Fantasy Tracker'
      }
    })

    if (!teamsResponse.ok) {
      const errorText = await teamsResponse.text()
      console.error('Teams request failed:', teamsResponse.status, errorText)
      return NextResponse.json({ 
        error: 'Failed to fetch teams from Yahoo',
        details: errorText,
        status: teamsResponse.status
      }, { status: 500 })
    }

    const teamsData = await teamsResponse.json()
    console.log('Raw teams data:', JSON.stringify(teamsData, null, 2))

    // Parse teams from Yahoo's complex structure
    const teams: Array<{
      team_key: any
      team_id: any
      name: any
      manager_nickname: any
    }> = []
    if (teamsData.fantasy_content?.league?.[1]?.teams) {
      const teamsObj = teamsData.fantasy_content.league[1].teams
      for (const teamKey in teamsObj) {
        if (teamKey !== 'count') {
          const team = teamsObj[teamKey].team
          teams.push({
            team_key: team[0].team_key,
            team_id: team[0].team_id,
            name: team[0].name,
            manager_nickname: team[0].managers?.[0]?.manager?.nickname || 'Unknown Manager'
          })
        }
      }
    }

    console.log(`✅ Found ${teams.length} teams in Yahoo league`)
    teams.forEach(team => {
      console.log(`   - ${team.name} (${team.manager_nickname}) - Team Key: ${team.team_key}`)
    })

    // Step 2: Update managers table with Yahoo team keys
    console.log('\n🔄 Mapping Yahoo teams to database managers...')
    
    // Get current managers from database
    const { data: dbManagers, error: managersError } = await supabase
      .from('managers')
      .select('id, manager_name')
      .order('manager_name')

    if (managersError) {
      console.error('Error fetching managers:', managersError)
      return NextResponse.json({ error: 'Failed to fetch managers' }, { status: 500 })
    }

    console.log(`Found ${dbManagers.length} managers in database`)

    // For now, let's create a mapping based on team order (you can adjust this manually later)
    const teamMappings: Array<{
      manager_id: unknown
      manager_name: unknown
      yahoo_team_key: any
      yahoo_team_name: any
      yahoo_manager: any
    }> = []
    for (let i = 0; i < Math.min(teams.length, dbManagers.length); i++) {
      teamMappings.push({
        manager_id: dbManagers[i].id,
        manager_name: dbManagers[i].manager_name,
        yahoo_team_key: teams[i].team_key,
        yahoo_team_name: teams[i].name,
        yahoo_manager: teams[i].manager_nickname
      })
    }

    console.log('Proposed team mappings:')
    teamMappings.forEach(mapping => {
      console.log(`   ${mapping.manager_name} → ${mapping.yahoo_team_name} (${mapping.yahoo_manager}) [${mapping.yahoo_team_key}]`)
    })

    // Update managers table with Yahoo team keys
    for (const mapping of teamMappings) {
      const { error: updateError } = await supabase
        .from('managers')
        .update({ yahoo_team_key: mapping.yahoo_team_key })
        .eq('id', String(mapping.manager_id))

      if (updateError) {
        console.error(`Error updating manager ${mapping.manager_name}:`, updateError)
      } else {
        console.log(`✅ Updated ${mapping.manager_name} with team key ${mapping.yahoo_team_key}`)
      }
    }

    // Step 3: Get rosters for each team
    console.log('\n📋 Fetching rosters for all teams...')
    const allRosterEntries: Array<{
      team_key: any
      yahoo_player_id: any  
      status: any
      raw_data: any
    }> = []

    for (const team of teams) {
      console.log(`   Getting roster for ${team.name} (${team.team_key})...`)
      
      try {
        const rosterResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/team/${team.team_key}/roster?format=json`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'UAFBL Fantasy Tracker'
          }
        })

        if (!rosterResponse.ok) {
          console.error(`   ❌ Failed to get roster for ${team.name}: ${rosterResponse.status}`)
          continue
        }

        const rosterData = await rosterResponse.json()
        
        if (rosterData.fantasy_content?.team?.[1]?.roster?.[1]?.players) {
          const playersObj = rosterData.fantasy_content.team[1].roster[1].players
          
          for (const playerKey in playersObj) {
            if (playerKey !== 'count') {
              const player = playersObj[playerKey].player
              
              allRosterEntries.push({
                team_key: team.team_key,
                yahoo_player_id: player[0].player_id,
                status: player[0].status || 'active',
                raw_data: player[0]
              })
            }
          }
        }

        console.log(`   ✅ ${team.name}: Found ${allRosterEntries.filter(r => r.team_key === team.team_key).length} players`)
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 250))
        
      } catch (error) {
        console.error(`   ❌ Error getting roster for ${team.name}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }

    console.log(`\n📊 Total roster entries collected: ${allRosterEntries.length}`)

    // Step 4: Store in temp table
    console.log('💾 Storing roster data in yahoo_rosters_temp...')
    
    // Clear existing data
    const { error: deleteError } = await supabase
      .from('yahoo_rosters_temp')
      .delete()
      .like('team_key', `${leagueKey}%`)

    if (deleteError) {
      console.error('Error clearing temp table:', deleteError)
    } else {
      console.log('🧹 Cleared existing roster data')
    }

    // Insert in batches
    const batchSize = 50
    let insertedCount = 0

    for (let i = 0; i < allRosterEntries.length; i += batchSize) {
      const batch = allRosterEntries.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('yahoo_rosters_temp')
        .insert(batch)

      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError.message)
      } else {
        insertedCount += batch.length
        console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} entries`)
      }
    }

    // Step 5: Generate summary
    console.log('\n📊 Generating import summary...')
    
    const { data: summaryData, error: summaryError } = await supabase
      .from('yahoo_rosters_temp')
      .select('team_key, yahoo_player_id')
      .like('team_key', `${leagueKey}%`)

    const teamSummary: Record<string, number> = {}
    summaryData?.forEach(entry => {
      const teamKey = String(entry.team_key || '')
      if (!teamSummary[teamKey]) {
        teamSummary[teamKey] = 0
      }
      teamSummary[teamKey]++
    })

    console.log('✅ Yahoo roster import completed!')

    return NextResponse.json({
      success: true,
      message: 'Yahoo rosters imported successfully!',
      summary: {
        league_key: leagueKey,
        teams_found: teams.length,
        managers_mapped: teamMappings.length,
        total_roster_entries: insertedCount,
        teams_summary: teamSummary
      },
      teams: teams,
      mappings: teamMappings
    })

  } catch (error) {
    console.error('Yahoo roster import error:', error)
    return NextResponse.json({ 
      error: 'Failed to import Yahoo rosters',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to check import status
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  try {
    const { data: rosterCount, error: countError } = await supabase
      .from('yahoo_rosters_temp')
      .select('team_key, yahoo_player_id', { count: 'exact' })
      .like('team_key', '466.l.5701%')

    if (countError) {
      return NextResponse.json({ error: 'Failed to check import status' }, { status: 500 })
    }

    const { data: managerMappings, error: mappingError } = await supabase
      .from('managers')
      .select('id, manager_name, yahoo_team_key')
      .not('yahoo_team_key', 'is', null)

    return NextResponse.json({
      status: 'ready',
      roster_entries_imported: rosterCount?.length || 0,
      managers_mapped: managerMappings?.length || 0,
      managers_with_yahoo_keys: managerMappings || []
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}