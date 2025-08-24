#!/usr/bin/env node

/**
 * Yahoo Fantasy All Players Fetcher
 * Fetches ALL players using pagination
 */

const https = require('https')
const fs = require('fs')

// Check if we have tokens
if (!fs.existsSync('./yahoo-tokens.json')) {
  console.error('❌ No tokens found. Please run yahoo-get-token.js first.')
  process.exit(1)
}

const tokens = JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'))

console.log('🏀 Fetching ALL Yahoo Fantasy Players')
console.log('=====================================')

// Fetch Yahoo Fantasy players with pagination
async function fetchYahooPlayersPage(accessToken, start = 0, count = 25) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      port: 443,
      path: `/fantasy/v2/game/466/players?format=json&start=${start}&count=${count}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }

    console.log(`📡 Fetching players ${start}-${start + count - 1}...`)

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const response = JSON.parse(data)
            resolve(response)
          } else {
            console.log(`❌ Error response for page ${start}:`, data.substring(0, 500))
            reject(new Error(`Yahoo Fantasy API returned ${res.statusCode}: ${data}`))
          }
        } catch (error) {
          reject(new Error(`Failed to parse players response: ${error.message}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

function parsePlayersFromResponse(playersResponse) {
  let players = []
  
  try {
    // Yahoo API response structure: fantasy_content.game[1].players[0].player[]
    if (playersResponse.fantasy_content && playersResponse.fantasy_content.game) {
      const games = Array.isArray(playersResponse.fantasy_content.game) 
        ? playersResponse.fantasy_content.game 
        : [playersResponse.fantasy_content.game]
      
      // Look for the game with players data (usually the second element)
      for (const game of games) {
        if (game.players && game.players[0] && game.players[0].player) {
          players = game.players[0].player
          break
        }
      }
    }
  } catch (error) {
    console.error('❌ Error parsing response:', error.message)
  }
  
  return players
}

function processPlayer(playerData, index) {
  try {
    // Yahoo API structure: each player is an array of objects with single properties
    if (!Array.isArray(playerData)) {
      console.warn(`⚠️ Player ${index + 1}: Expected array, got ${typeof playerData}`)
      return null
    }
    
    // Convert array of objects to single object
    const player = {}
    playerData.forEach(obj => {
      Object.assign(player, obj)
    })
    
    // Extract player information
    const playerId = player.player_id
    const playerKey = player.player_key
    const name = player.name?.full
    const firstName = player.name?.first
    const lastName = player.name?.last
    const team = player.editorial_team_abbr
    
    // Handle positions - can be nested array structure
    let positions = null
    if (player.eligible_positions && Array.isArray(player.eligible_positions)) {
      positions = player.eligible_positions.map(pos => {
        if (typeof pos === 'object' && pos.position) {
          return pos.position
        }
        return pos
      }).join(',')
    } else if (player.position) {
      positions = player.position
    }
    
    if (!playerId || !name) {
      console.warn(`⚠️ Player ${index + 1}: Missing required data (ID: ${playerId}, Name: ${name})`)
      return null
    }
    
    return {
      yahoo_player_id: playerId.toString(),
      yahoo_name_full: name.trim(),
      yahoo_first_name: firstName?.trim() || null,
      yahoo_last_name: lastName?.trim() || null,
      yahoo_team_abbr: team || null,
      yahoo_positions: positions || null,
      yahoo_player_key: playerKey || playerId.toString()
    }
  } catch (error) {
    console.error(`❌ Error processing player ${index + 1}:`, error.message)
    return null
  }
}

async function main() {
  try {
    let allPlayers = []
    let start = 0
    const pageSize = 25 // Yahoo seems to work better with smaller page sizes
    let hasMore = true
    let pageCount = 0
    const maxPages = 200 // Safety limit (25 * 200 = 5000 players max)
    
    console.log(`🔑 Using stored access token from yahoo-tokens.json`)
    
    while (hasMore && pageCount < maxPages) {
      try {
        const response = await fetchYahooPlayersPage(tokens.access_token, start, pageSize)
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
        
        // Check if we got fewer players than requested (indicates end of data)
        if (players.length < pageSize) {
          console.log(`📊 Got ${players.length} players (less than ${pageSize}), assuming end of data`)
          hasMore = false
        } else {
          start += pageSize
          pageCount++
          
          // Small delay to be nice to Yahoo's API
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
      } catch (error) {
        if (error.message.includes('401') || error.message.includes('403')) {
          console.error('❌ Authentication failed. Token may be expired.')
          console.log('Please run: node yahoo-auth-simple.js to get a new token')
          break
        }
        
        console.error(`❌ Error fetching page ${pageCount + 1}:`, error.message)
        
        // Try to continue with next page in case it was a temporary error
        start += pageSize
        pageCount++
        
        if (pageCount >= 5) { // Stop after 5 consecutive errors
          console.error('❌ Too many errors, stopping')
          break
        }
      }
    }
    
    console.log(`\n📊 Final Results:`)
    console.log(`- Total pages fetched: ${pageCount + 1}`)
    console.log(`- Total players collected: ${allPlayers.length}`)
    
    if (allPlayers.length === 0) {
      console.error('❌ No players found')
      return
    }
    
    // Add row numbers
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
    allPlayers.slice(0, 5).forEach(player => {
      console.log(`- ${player.yahoo_name_full} (${player.yahoo_player_id}) [${player.yahoo_team_abbr || 'No Team'}] (${player.yahoo_positions || 'No Pos'})`)
    })
    
    // Save processed data
    const outputData = {
      metadata: {
        processedAt: new Date().toISOString(),
        sourceAPI: 'Yahoo Fantasy API (OAuth2 - All Players)',
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
    process.exit(1)
  }
}

main()