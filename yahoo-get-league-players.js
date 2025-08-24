#!/usr/bin/env node

/**
 * Get All Players from User's Yahoo Fantasy League
 * This should give us access to the full player database
 */

const https = require('https')
const fs = require('fs')

// Check if we have tokens
if (!fs.existsSync('./yahoo-tokens.json')) {
  console.error('❌ No tokens found. Please run yahoo-get-token.js first.')
  process.exit(1)
}

const tokens = JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'))

console.log('🏀 Fetching All Players from Your League')
console.log('========================================')

// Your league key from the previous response
const LEAGUE_KEY = '466.l.5701'

// Fetch all players from league with pagination
async function fetchLeaguePlayers(start = 0, count = 25) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      port: 443,
      path: `/fantasy/v2/league/${LEAGUE_KEY}/players;start=${start};count=${count}?format=json`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    }

    console.log(`📡 Fetching players ${start}-${start + count - 1} from league ${LEAGUE_KEY}...`)

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        console.log(`📊 Response status: ${res.statusCode}`)
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data)
            resolve(response)
          } catch (error) {
            console.log('❌ JSON parse error:', error.message)
            resolve(null)
          }
        } else {
          console.log(`❌ API Error: ${res.statusCode} - ${data.substring(0, 300)}`)
          resolve(null)
        }
      })
    })

    req.on('error', (error) => {
      console.log(`❌ Request error: ${error.message}`)
      resolve(null)
    })
    
    req.end()
  })
}

function parsePlayersFromResponse(response) {
  let players = []
  
  try {
    if (response && response.fantasy_content && response.fantasy_content.league) {
      const league = Array.isArray(response.fantasy_content.league) 
        ? response.fantasy_content.league[1] || response.fantasy_content.league[0]
        : response.fantasy_content.league
      
      if (league.players && league.players[0] && league.players[0].player) {
        players = league.players[0].player
      }
    }
  } catch (error) {
    console.error('❌ Error parsing players:', error.message)
  }
  
  return players
}

function processPlayer(playerData, index) {
  try {
    if (!Array.isArray(playerData)) {
      return null
    }
    
    // Convert array of objects to single object
    const player = {}
    playerData.forEach(obj => {
      Object.assign(player, obj)
    })
    
    const playerId = player.player_id
    const playerKey = player.player_key
    const name = player.name?.full
    const firstName = player.name?.first
    const lastName = player.name?.last
    const team = player.editorial_team_abbr
    
    // Handle positions
    let positions = null
    if (player.eligible_positions && Array.isArray(player.eligible_positions)) {
      positions = player.eligible_positions.map(pos => {
        if (typeof pos === 'object' && pos.position) return pos.position
        return pos
      }).join(',')
    }
    
    if (!playerId || !name) {
      return null
    }
    
    return {
      yahoo_player_id: playerId.toString(),
      yahoo_name_full: name.trim(),
      yahoo_first_name: firstName?.trim() || null,
      yahoo_last_name: lastName?.trim() || null,
      yahoo_team_abbr: team || null,
      yahoo_positions: positions || null,
      yahoo_player_key: playerKey || playerId.toString(),
      row_number: index + 1
    }
  } catch (error) {
    return null
  }
}

async function main() {
  try {
    console.log(`🔑 Using league: Urban Achievers (${LEAGUE_KEY})`)
    
    let allPlayers = []
    let start = 0
    const pageSize = 25
    let hasMore = true
    let pageCount = 0
    const maxPages = 500 // Safety limit
    
    while (hasMore && pageCount < maxPages) {
      const response = await fetchLeaguePlayers(start, pageSize)
      
      if (!response) {
        console.log(`❌ Failed to get response for start=${start}`)
        break
      }
      
      // Show a sample of the first response structure
      if (pageCount === 0) {
        console.log('\n🔍 First response structure preview:')
        console.log(JSON.stringify(response, null, 2).substring(0, 1500) + '...')
      }
      
      const players = parsePlayersFromResponse(response)
      
      if (players.length === 0) {
        console.log(`📊 No more players found at start=${start}`)
        hasMore = false
        break
      }
      
      // Process players
      const processedPlayers = players
        .map((playerData, index) => processPlayer(playerData, start + index))
        .filter(Boolean)
      
      console.log(`✅ Got ${processedPlayers.length} valid players from page ${pageCount + 1}`)
      
      allPlayers = [...allPlayers, ...processedPlayers]
      
      // Check if we got fewer players than requested
      if (players.length < pageSize) {
        console.log(`📊 Got ${players.length} players (less than ${pageSize}), assuming end of data`)
        hasMore = false
      } else {
        start += pageSize
        pageCount++
        
        // Small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 250))
      }
    }
    
    console.log(`\n📊 Final Results:`)
    console.log(`- Total pages fetched: ${pageCount + 1}`)
    console.log(`- Total players collected: ${allPlayers.length}`)
    
    if (allPlayers.length === 0) {
      console.error('❌ No players found')
      console.log('💡 This might mean:')
      console.log('- The league is in pre-draft state')
      console.log('- Different API endpoint needed')
      console.log('- Permission issues')
      return
    }
    
    // Add final row numbers
    allPlayers.forEach((player, index) => {
      player.row_number = index + 1
    })
    
    // Show statistics
    const stats = {
      totalPlayers: allPlayers.length,
      playersWithTeams: allPlayers.filter(p => p.yahoo_team_abbr).length,
      playersWithPositions: allPlayers.filter(p => p.yahoo_positions).length,
      uniqueTeams: new Set(allPlayers.map(p => p.yahoo_team_abbr).filter(Boolean)).size,
      uniqueNames: new Set(allPlayers.map(p => p.yahoo_name_full?.toLowerCase()).filter(Boolean)).size
    }
    
    console.log('\n📈 Yahoo Player Statistics:')
    console.log(`- Total players: ${stats.totalPlayers}`)
    console.log(`- Players with teams: ${stats.playersWithTeams}`)
    console.log(`- Players with positions: ${stats.playersWithPositions}`)
    console.log(`- Unique teams: ${stats.uniqueTeams}`)
    console.log(`- Unique names: ${stats.uniqueNames}`)
    
    // Show sample players
    console.log('\n👥 Sample players:')
    allPlayers.slice(0, 15).forEach(player => {
      console.log(`- ${player.yahoo_name_full} (${player.yahoo_player_id}) [${player.yahoo_team_abbr || 'FA'}] (${player.yahoo_positions || 'No Pos'})`)
    })
    
    // Save processed data
    const outputData = {
      metadata: {
        processedAt: new Date().toISOString(),
        sourceAPI: 'Yahoo Fantasy League API',
        leagueKey: LEAGUE_KEY,
        leagueName: 'Urban Achievers',
        totalProcessed: allPlayers.length,
        totalSkipped: 0,
        pagesFetched: pageCount + 1,
        stats
      },
      players: allPlayers
    }
    
    fs.writeFileSync('./yahoo-players-processed.json', JSON.stringify(outputData, null, 2))
    console.log(`\n💾 Saved all ${allPlayers.length} players to: yahoo-players-processed.json`)
    
    console.log('\n🎯 Next Steps:')
    console.log('1. Review the processed data in yahoo-players-processed.json')
    console.log('2. Run the matching script: node match-yahoo-players.js --dry-run')
    console.log('3. If everything looks good, run: node match-yahoo-players.js')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('401')) {
      console.log('Please get a fresh token: node yahoo-auth-simple.js')
    }
  }
}

main()