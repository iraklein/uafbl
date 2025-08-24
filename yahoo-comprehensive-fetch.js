#!/usr/bin/env node

/**
 * Comprehensive Yahoo Player Fetcher
 * Combines multiple strategies to get as many Yahoo players as possible
 */

const https = require('https')
const fs = require('fs')

// Check if we have tokens
if (!fs.existsSync('./yahoo-tokens.json')) {
  console.error('❌ No tokens found. Please run yahoo-get-token.js first.')
  process.exit(1)
}

const tokens = JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'))

console.log('🏀 Comprehensive Yahoo Player Collection')
console.log('=======================================')

// Fetch players by different filters
async function fetchYahooPlayers(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      port: 443,
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    }

    console.log(`📡 ${description}...`)

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data)
            const players = parsePlayersFromResponse(response)
            resolve(players)
          } catch (error) {
            console.log(`❌ Parse error for ${description}: ${error.message}`)
            resolve([])
          }
        } else {
          console.log(`❌ API error for ${description}: ${res.statusCode}`)
          resolve([])
        }
      })
    })

    req.on('error', (error) => {
      console.log(`❌ Request error for ${description}: ${error.message}`)
      resolve([])
    })
    
    req.end()
  })
}

function parsePlayersFromResponse(playersResponse) {
  let players = []
  
  try {
    if (playersResponse.fantasy_content && playersResponse.fantasy_content.game) {
      const games = Array.isArray(playersResponse.fantasy_content.game) 
        ? playersResponse.fantasy_content.game 
        : [playersResponse.fantasy_content.game]
      
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

function processPlayer(playerData, source) {
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
        if (typeof pos === 'object' && pos.position) {
          return pos.position
        }
        return pos
      }).join(',')
    } else if (player.position) {
      positions = player.position
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
      source: source
    }
  } catch (error) {
    return null
  }
}

async function main() {
  const allPlayers = new Map() // Use Map to deduplicate by player_id
  
  // Strategy 1: Fetch by position to get different top players
  const positions = ['PG', 'SG', 'SF', 'PF', 'C']
  
  for (const position of positions) {
    const path = `/fantasy/v2/game/466/players?format=json&position=${position}&start=0&count=100`
    const players = await fetchYahooPlayers(path, `Fetching top ${position} players`)
    
    players.forEach(playerData => {
      const player = processPlayer(playerData, `position_${position}`)
      if (player) {
        allPlayers.set(player.yahoo_player_id, player)
      }
    })
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  // Strategy 2: Try different start positions
  for (let start = 0; start <= 200; start += 25) {
    const path = `/fantasy/v2/game/466/players?format=json&start=${start}&count=25`
    const players = await fetchYahooPlayers(path, `Fetching players ${start}-${start+24}`)
    
    if (players.length === 0) {
      console.log(`📊 No more players at start=${start}, stopping pagination`)
      break
    }
    
    players.forEach(playerData => {
      const player = processPlayer(playerData, `pagination_${start}`)
      if (player) {
        allPlayers.set(player.yahoo_player_id, player)
      }
    })
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  // Strategy 3: Try different status filters
  const statuses = ['A', 'NA', 'WAIVERS', 'FA']
  for (const status of statuses) {
    const path = `/fantasy/v2/game/466/players?format=json&status=${status}&start=0&count=100`
    const players = await fetchYahooPlayers(path, `Fetching ${status} status players`)
    
    players.forEach(playerData => {
      const player = processPlayer(playerData, `status_${status}`)
      if (player) {
        allPlayers.set(player.yahoo_player_id, player)
      }
    })
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  // Convert Map to Array
  const finalPlayers = Array.from(allPlayers.values())
  
  console.log(`\n📊 Collection Results:`)
  console.log(`- Unique players found: ${finalPlayers.length}`)
  
  // Show breakdown by source
  const sources = {}
  finalPlayers.forEach(player => {
    sources[player.source] = (sources[player.source] || 0) + 1
  })
  
  console.log('\n📈 Players by source:')
  Object.entries(sources).forEach(([source, count]) => {
    console.log(`- ${source}: ${count} players`)
  })
  
  if (finalPlayers.length === 0) {
    console.error('❌ No players found from any strategy')
    return
  }
  
  // Add row numbers and remove source field
  finalPlayers.forEach((player, index) => {
    player.row_number = index + 1
    delete player.source
  })
  
  // Show statistics
  const stats = {
    totalPlayers: finalPlayers.length,
    playersWithTeams: finalPlayers.filter(p => p.yahoo_team_abbr).length,
    playersWithPositions: finalPlayers.filter(p => p.yahoo_positions).length,
    uniqueTeams: new Set(finalPlayers.map(p => p.yahoo_team_abbr).filter(Boolean)).size,
    uniqueNames: new Set(finalPlayers.map(p => p.yahoo_name_full?.toLowerCase()).filter(Boolean)).size
  }
  
  console.log('\n📈 Final Statistics:')
  console.log(`- Total unique players: ${stats.totalPlayers}`)
  console.log(`- Players with teams: ${stats.playersWithTeams}`)
  console.log(`- Players with positions: ${stats.playersWithPositions}`)
  console.log(`- Unique teams: ${stats.uniqueTeams}`)
  console.log(`- Unique names: ${stats.uniqueNames}`)
  
  // Show sample players
  console.log('\n👥 Sample players collected:')
  finalPlayers.slice(0, 10).forEach(player => {
    console.log(`- ${player.yahoo_name_full} (${player.yahoo_player_id}) [${player.yahoo_team_abbr || 'No Team'}] (${player.yahoo_positions || 'No Pos'})`)
  })
  
  // Save data
  const outputData = {
    metadata: {
      processedAt: new Date().toISOString(),
      sourceAPI: 'Yahoo Fantasy API (Comprehensive Collection)',
      totalProcessed: finalPlayers.length,
      totalSkipped: 0,
      strategies: Object.keys(sources),
      stats
    },
    players: finalPlayers
  }
  
  fs.writeFileSync('./yahoo-players-processed.json', JSON.stringify(outputData, null, 2))
  console.log(`\n💾 Saved ${finalPlayers.length} unique players to: yahoo-players-processed.json`)
  
  console.log('\n🎯 Next Steps:')
  console.log('1. Review the processed data in yahoo-players-processed.json')
  console.log('2. Run the matching script: node match-yahoo-players.js --dry-run')
  console.log('3. If everything looks good, run: node match-yahoo-players.js')
  console.log('\n💡 Note: This may still be a subset of all Yahoo players.')
  console.log('Yahoo\'s API seems to limit public access to top/featured players only.')
  console.log('For a complete dataset, you might need different API credentials or methods.')
}

main()