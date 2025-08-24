#!/usr/bin/env node

/**
 * Yahoo Fantasy Player Import - Recreation of Working Method
 * Based on what worked before with proper bulk player access
 */

const https = require('https')
const fs = require('fs')

// Check if we have tokens
if (!fs.existsSync('./yahoo-tokens.json')) {
  console.error('❌ No tokens found. Please run yahoo-get-token.js first.')
  process.exit(1)
}

const tokens = JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'))

console.log('🏀 Yahoo Fantasy Player Import - Recreating Working Method')
console.log('========================================================')

// Try the method that worked before - different URL structures
async function fetchWithBearerToken(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; UAFBL-Import/1.0)',
        'Content-Type': 'application/json'
      }
    }

    console.log(`📡 ${description}: ${path}`)

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`)
        
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data)
            resolve({ success: true, data: response, path })
          } catch (error) {
            console.log(`❌ Parse error: ${error.message}`)
            resolve({ success: false, error: error.message, path })
          }
        } else {
          console.log(`❌ Error: ${res.statusCode}`)
          if (data.length < 500) {
            console.log(`Response: ${data}`)
          }
          resolve({ success: false, error: `HTTP ${res.statusCode}`, path })
        }
      })
    })

    req.on('error', (error) => {
      console.log(`❌ Request error: ${error.message}`)
      resolve({ success: false, error: error.message, path })
    })
    
    req.end()
  })
}

function parsePlayersFromResponse(response) {
  let players = []
  
  try {
    // Handle different response structures that might have worked before
    const content = response.fantasy_content
    
    if (content) {
      // Structure 1: game.players array
      if (content.game) {
        const games = Array.isArray(content.game) ? content.game : [content.game]
        for (const game of games) {
          if (game.players) {
            if (game.players[0] && game.players[0].player) {
              players = game.players[0].player
              break
            } else if (Array.isArray(game.players)) {
              players = game.players
              break
            }
          }
        }
      }
      
      // Structure 2: league.players array  
      if (players.length === 0 && content.league) {
        const leagues = Array.isArray(content.league) ? content.league : [content.league]
        for (const league of leagues) {
          if (league.players) {
            if (league.players[0] && league.players[0].player) {
              players = league.players[0].player
              break
            } else if (Array.isArray(league.players)) {
              players = league.players
              break
            }
          }
        }
      }
      
      // Structure 3: direct players array
      if (players.length === 0 && content.players) {
        if (Array.isArray(content.players)) {
          players = content.players
        } else if (content.players.player) {
          players = Array.isArray(content.players.player) ? content.players.player : [content.players.player]
        }
      }
    }
  } catch (error) {
    console.error('❌ Error parsing players:', error.message)
  }
  
  return players
}

function processPlayer(playerData, index) {
  try {
    let player = playerData
    
    // Handle array format
    if (Array.isArray(playerData)) {
      player = {}
      playerData.forEach(obj => {
        Object.assign(player, obj)
      })
    }
    
    const playerId = player.player_id
    const playerKey = player.player_key
    const name = player.name?.full || player.full_name
    const firstName = player.name?.first || player.first_name
    const lastName = player.name?.last || player.last_name
    const team = player.editorial_team_abbr || player.team_abbr
    
    let positions = null
    if (player.eligible_positions) {
      if (Array.isArray(player.eligible_positions)) {
        positions = player.eligible_positions.map(pos => {
          return typeof pos === 'object' ? pos.position : pos
        }).join(',')
      } else if (typeof player.eligible_positions === 'string') {
        positions = player.eligible_positions
      }
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
    console.log('🔑 Using stored OAuth 2.0 Bearer token')
    
    // Try different endpoint formats that might have worked before
    const endpoints = [
      // Basic game endpoints with different formats
      { 
        path: '/fantasy/v2/game/466/players?format=json&count=25&start=0',
        desc: 'Game players with basic pagination'
      },
      { 
        path: '/fantasy/v2/game/nba/players?format=json&count=25&start=0',
        desc: 'NBA game players with basic pagination'
      },
      // Different parameter ordering
      { 
        path: '/fantasy/v2/game/466/players?count=25&start=0&format=json',
        desc: 'Game players with reordered params'
      },
      // Different separator styles (maybe this was the key!)
      { 
        path: '/fantasy/v2/game/466/players;count=25;start=0?format=json',
        desc: 'Game players with semicolon separators'
      },
      { 
        path: '/fantasy/v2/game/nba/players;count=25;start=0?format=json',
        desc: 'NBA players with semicolon separators'
      },
      // Batch request format
      { 
        path: '/fantasy/v2/games;game_keys=466/players?format=json&count=25',
        desc: 'Batch games request'
      },
      // Different count values
      { 
        path: '/fantasy/v2/game/466/players?format=json&count=100&start=0',
        desc: 'Game players count=100'
      },
      { 
        path: '/fantasy/v2/game/nba/players?format=json&count=100&start=0',
        desc: 'NBA players count=100'
      }
    ]
    
    let bestResult = null
    
    for (const endpoint of endpoints) {
      const result = await fetchWithBearerToken(endpoint.path, endpoint.desc)
      
      if (result.success) {
        const players = parsePlayersFromResponse(result.data)
        console.log(`👥 Found ${players.length} players`)
        
        if (players.length > 1) {
          console.log(`✅ SUCCESS! Found ${players.length} players using: ${endpoint.desc}`)
          bestResult = { ...result, players, endpoint }
          break // Found a working endpoint!
        } else if (players.length === 1) {
          console.log(`⚠️ Only 1 player found (might still be limited)`)
          if (!bestResult) {
            bestResult = { ...result, players, endpoint }
          }
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    if (!bestResult || bestResult.players.length === 0) {
      console.error('❌ No working endpoints found that return players')
      console.log('\n💡 This suggests either:')
      console.log('- Token has expired or insufficient permissions')
      console.log('- Yahoo API has changed since it worked before')
      console.log('- Different authentication method was used before')
      return
    }
    
    console.log(`\n🎯 Using best result: ${bestResult.players.length} players from "${bestResult.endpoint.desc}"`)
    
    // Process all players
    const processedPlayers = bestResult.players
      .map((playerData, index) => processPlayer(playerData, index))
      .filter(Boolean)
    
    if (processedPlayers.length === 0) {
      console.error('❌ No valid players after processing')
      return
    }
    
    console.log(`✅ Successfully processed ${processedPlayers.length} players`)
    
    // Show sample
    console.log('\n👥 Sample players:')
    processedPlayers.slice(0, 10).forEach(player => {
      console.log(`- ${player.yahoo_name_full} (${player.yahoo_player_id}) [${player.yahoo_team_abbr || 'FA'}]`)
    })
    
    // If we only got 1 player, try pagination to get more
    if (processedPlayers.length === 1) {
      console.log('\n🔄 Trying pagination to get more players...')
      
      let allPlayers = [...processedPlayers]
      let start = 1
      const pageSize = 25
      
      for (let page = 1; page <= 10; page++) { // Try up to 10 pages
        const paginatedPath = bestResult.endpoint.path.replace(/start=\d+/, `start=${start}`)
        const pageResult = await fetchWithBearerToken(paginatedPath, `Page ${page + 1}`)
        
        if (pageResult.success) {
          const pagePlayers = parsePlayersFromResponse(pageResult.data)
          const processedPagePlayers = pagePlayers
            .map((playerData, index) => processPlayer(playerData, start + index))
            .filter(Boolean)
          
          if (processedPagePlayers.length === 0) {
            console.log(`📊 No more players at page ${page + 1}, stopping`)
            break
          }
          
          console.log(`✅ Page ${page + 1}: ${processedPagePlayers.length} players`)
          allPlayers = [...allPlayers, ...processedPagePlayers]
          start += pageSize
          
          await new Promise(resolve => setTimeout(resolve, 300))
        } else {
          break
        }
      }
      
      console.log(`\n📊 Total collected: ${allPlayers.length} players`)
      
      // Update the final results
      const finalProcessedPlayers = allPlayers
    }
    
    // Use the final results for statistics
    const finalPlayers = finalProcessedPlayers || processedPlayers
    
    // Final statistics
    const stats = {
      totalPlayers: finalPlayers.length,
      playersWithTeams: finalPlayers.filter(p => p.yahoo_team_abbr).length,
      playersWithPositions: finalPlayers.filter(p => p.yahoo_positions).length,
      uniqueTeams: new Set(finalPlayers.map(p => p.yahoo_team_abbr).filter(Boolean)).size,
      uniqueNames: new Set(finalPlayers.map(p => p.yahoo_name_full?.toLowerCase()).filter(Boolean)).size
    }
    
    console.log('\n📈 Final Yahoo Player Statistics:')
    console.log(`- Total players: ${stats.totalPlayers}`)
    console.log(`- Players with teams: ${stats.playersWithTeams}`)
    console.log(`- Players with positions: ${stats.playersWithPositions}`)
    console.log(`- Unique teams: ${stats.uniqueTeams}`)
    console.log(`- Unique names: ${stats.uniqueNames}`)
    
    // Save data
    const outputData = {
      metadata: {
        processedAt: new Date().toISOString(),
        sourceAPI: 'Yahoo Fantasy API (Recreated Method)',
        workingEndpoint: bestResult.endpoint,
        totalProcessed: finalPlayers.length,
        totalSkipped: 0,
        stats
      },
      players: finalPlayers
    }
    
    fs.writeFileSync('./yahoo-players-processed.json', JSON.stringify(outputData, null, 2))
    console.log(`\n💾 Saved ${finalPlayers.length} players to: yahoo-players-processed.json`)
    
    console.log('\n🎯 Next Steps:')
    console.log('1. Review the processed data in yahoo-players-processed.json')
    console.log('2. Run the matching script: node match-yahoo-players.js --dry-run')
    console.log('3. If everything looks good, run: node match-yahoo-players.js')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

main()