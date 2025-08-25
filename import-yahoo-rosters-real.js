#!/usr/bin/env node

/**
 * Import real Yahoo rosters to temp table
 */

const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Load environment variables 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjhrwwxvwqwmsjvelgrv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function importYahooRosters() {
  try {
    console.log('🏀 Importing real Yahoo rosters to temp table...')
    console.log('===============================================')

    // Read the raw Yahoo roster data
    const rostersData = JSON.parse(fs.readFileSync('./yahoo-rosters-raw.json', 'utf8'))
    
    const league = rostersData.fantasy_content.league[1]
    const teamsData = league.teams
    
    console.log(`📊 Processing ${teamsData.count} teams...`)

    // Clear existing temp data
    console.log('🧹 Clearing existing temp data...')
    const { error: clearError } = await supabase
      .from('yahoo_rosters_temp')
      .delete()
      .like('team_key', '466.l.5701%')

    if (clearError) {
      console.error('Error clearing temp data:', clearError)
      return
    }

    const rosterEntries = []
    
    // Process each team
    for (let i = 0; i < teamsData.count; i++) {
      const teamContainer = teamsData[i.toString()]
      
      if (!teamContainer || !teamContainer.team || !Array.isArray(teamContainer.team)) {
        console.warn(`⚠️ Team ${i+1}: Invalid structure`)
        continue
      }

      // Parse team structure - Yahoo uses nested array format
      let teamInfo = {}
      let roster = null
      let managers = null

      for (const item of teamContainer.team) {
        if (Array.isArray(item)) {
          // This might be roster data - look for roster object
          for (const subItem of item) {
            if (subItem && typeof subItem === 'object' && subItem.roster) {
              roster = subItem.roster
            }
            if (subItem && typeof subItem === 'object' && subItem.managers) {
              managers = subItem.managers
            }
          }
        } else if (typeof item === 'object' && item !== null) {
          Object.assign(teamInfo, item)
        }
      }

      console.log(`\\n🏈 Team ${i+1}: ${teamInfo.name || 'Unknown'} (${teamInfo.team_key || 'No key'})`)
      
      // Get manager info
      let managerName = 'Unknown'
      if (managers && Array.isArray(managers)) {
        const manager = managers[0]
        if (manager && manager.manager) {
          const managerData = {}
          if (Array.isArray(manager.manager)) {
            manager.manager.forEach(item => Object.assign(managerData, item))
          } else {
            Object.assign(managerData, manager.manager)
          }
          managerName = managerData.nickname || managerData.guid || 'Unknown'
        }
      }
      
      console.log(`👥 Manager: ${managerName}`)

      if (!roster || !roster.players) {
        console.warn(`⚠️ No roster data found for team ${teamInfo.name}`)
        continue
      }

      const playersCount = roster.players.count || 0
      console.log(`🏀 Processing ${playersCount} players...`)

      // Process players
      for (let p = 0; p < playersCount; p++) {
        const playerContainer = roster.players[p.toString()]
        
        if (!playerContainer || !playerContainer.player || !Array.isArray(playerContainer.player)) {
          continue
        }

        // Parse player data
        let playerInfo = {}
        playerContainer.player.forEach(item => {
          if (item && typeof item === 'object') {
            Object.assign(playerInfo, item)
          }
        })

        const playerId = playerInfo.player_id
        const playerName = playerInfo.name?.full || 'Unknown Player'
        const positions = playerInfo.eligible_positions ? 
          (Array.isArray(playerInfo.eligible_positions) ? 
            playerInfo.eligible_positions.map(pos => typeof pos === 'object' ? pos.position : pos) : 
            [playerInfo.eligible_positions]) : []

        if (playerId) {
          rosterEntries.push({
            team_key: teamInfo.team_key,
            yahoo_player_id: playerId.toString(),
            status: playerInfo.status || 'active',
            raw_data: {
              player_id: playerId,
              name: playerInfo.name,
              team_abbr: playerInfo.editorial_team_abbr,
              positions: positions,
              player_key: playerInfo.player_key,
              manager_name: managerName,
              team_name: teamInfo.name
            },
            imported_at: new Date().toISOString()
          })
        }
      }
    }

    console.log(`\\n💾 Inserting ${rosterEntries.length} roster entries...`)
    
    // Insert in batches
    const batchSize = 50
    let insertedCount = 0
    
    for (let i = 0; i < rosterEntries.length; i += batchSize) {
      const batch = rosterEntries.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('yahoo_rosters_temp')
        .insert(batch)

      if (insertError) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError.message)
      } else {
        insertedCount += batch.length
        console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} entries`)
      }
    }

    // Generate summary by team
    const teamSummary = {}
    rosterEntries.forEach(entry => {
      const teamKey = entry.team_key
      const teamName = entry.raw_data.team_name
      
      if (!teamSummary[teamKey]) {
        teamSummary[teamKey] = {
          team_name: teamName,
          manager: entry.raw_data.manager_name,
          player_count: 0
        }
      }
      teamSummary[teamKey].player_count++
    })

    console.log('\\n📊 Import Summary:')
    console.log('===================')
    console.log(`Total entries inserted: ${insertedCount}`)
    console.log(`Teams processed: ${Object.keys(teamSummary).length}`)
    
    console.log('\\n🏈 Teams:')
    Object.entries(teamSummary).forEach(([key, info]) => {
      console.log(`   ${info.team_name}: ${info.player_count} players (${info.manager})`)
    })

    console.log('\\n✅ Real Yahoo roster import completed!')
    console.log('\\n🎯 Next steps:')
    console.log('1. Review data: GET http://localhost:3006/api/yahoo/import-rosters-simple')
    console.log('2. Map Yahoo team keys to database managers')
    console.log('3. Process the roster data for your application')

  } catch (error) {
    console.error('❌ Error importing rosters:', error.message)
    console.error(error.stack)
  }
}

importYahooRosters()