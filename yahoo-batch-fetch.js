#!/usr/bin/env node

/**
 * Yahoo Fantasy Batch Player Fetcher
 * Based on the successful approach from a few days ago
 */

const https = require('https')
const fs = require('fs')

// Check if we have tokens
if (!fs.existsSync('./yahoo-tokens.json')) {
  console.error('❌ No tokens found. Please run yahoo-get-token.js first.')
  process.exit(1)
}

const tokens = JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'))

console.log('🏀 Yahoo Fantasy Batch Player Fetcher')
console.log('====================================')

// Try the approach that worked before - fetch in batches with proper parsing
async function fetchYahooPlayersBatch(start = 0, count = 25) {
  return new Promise((resolve, reject) => {
    // Try different endpoint formats that might have worked before
    const paths = [
      `/fantasy/v2/game/466/players;start=${start};count=${count}?format=json`,
      `/fantasy/v2/game/466/players?format=json;start=${start};count=${count}`,
      `/fantasy/v2/game/466/players?format=json&start=${start}&count=${count}`,
      `/fantasy/v2/games;game_keys=466/players;start=${start};count=${count}?format=json`,
    ]
    
    let currentPathIndex = 0
    
    function tryNextPath() {
      if (currentPathIndex >= paths.length) {
        resolve({ players: [], total: 0, format: 'none_worked' })
        return
      }
      
      const path = paths[currentPathIndex]
      console.log(`📡 Trying path ${currentPathIndex + 1}: ${path}`)
      
      const options = {
        hostname: 'fantasysports.yahooapis.com',
        port: 443,
        path: path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json'
        }
      }

      const req = https.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => {
          console.log(`📊 Response status: ${res.statusCode}`)
          
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data)
              const result = parsePlayersFromResponse(response, currentPathIndex)
              
              if (result.players.length > 1) {
                console.log(`✅ Success with path ${currentPathIndex + 1}: Found ${result.players.length} players`)
                resolve(result)
                return
              } else {
                console.log(`⚠️ Path ${currentPathIndex + 1} only returned ${result.players.length} players`)
              }
            } catch (error) {
              console.log(`❌ Parse error for path ${currentPathIndex + 1}: ${error.message}`)
            }
          } else {
            console.log(`❌ API error for path ${currentPathIndex + 1}: ${res.statusCode}`)
            if (res.statusCode === 401) {
              reject(new Error('Authentication failed - token may be expired'))
              return
            }
          }
          
          currentPathIndex++
          setTimeout(tryNextPath, 500) // Small delay between attempts
        })
      })

      req.on('error', (error) => {
        console.log(`❌ Request error for path ${currentPathIndex + 1}: ${error.message}`)
        currentPathIndex++
        setTimeout(tryNextPath, 500)
      })
      
      req.end()
    }
    
    tryNextPath()
  })
}

function parsePlayersFromResponse(playersResponse, pathIndex) {
  let players = []
  let total = 0
  
  try {
    console.log('🔍 Response structure preview:')
    console.log(JSON.stringify(playersResponse, null, 2).substring(0, 1000) + '...')
    
    // Try different parsing approaches
    if (playersResponse.fantasy_content) {
      const content = playersResponse.fantasy_content
      
      // Approach 1: Standard game array structure
      if (content.game) {
        const games = Array.isArray(content.game) ? content.game : [content.game]
        
        for (const game of games) {
          if (game.players) {
            // Try different nested structures
            if (game.players.player && Array.isArray(game.players.player)) {
              players = game.players.player
              total = game.players.count || players.length
              break
            } else if (game.players[0] && game.players[0].player) {
              players = game.players[0].player
              total = game.players[0].count || players.length
              break
            } else if (Array.isArray(game.players)) {
              players = game.players
              total = players.length
              break
            }
          }
        }
      }
      
      // Approach 2: Direct players structure
      if (players.length === 0 && content.players) {
        if (Array.isArray(content.players)) {
          players = content.players
          total = players.length
        } else if (content.players.player) {
          players = Array.isArray(content.players.player) ? content.players.player : [content.players.player]
          total = content.players.count || players.length
        }
      }
    }
    
    console.log(`📊 Parsed ${players.length} players using path format ${pathIndex + 1}`)
    
  } catch (error) {
    console.error('❌ Error parsing response:', error.message)
  }
  
  return { players, total, format: `path_${pathIndex + 1}` }
}

function processPlayer(playerData, index) {
  try {
    // Handle different player data formats
    let player = playerData
    
    // If it's an array of objects (Yahoo's typical format), merge them
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
    
    // Handle positions
    let positions = null
    if (player.eligible_positions) {
      if (Array.isArray(player.eligible_positions)) {
        positions = player.eligible_positions.map(pos => {
          if (typeof pos === 'object' && pos.position) return pos.position
          return pos
        }).join(',')
      } else if (typeof player.eligible_positions === 'string') {
        positions = player.eligible_positions
      }
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
      yahoo_player_key: playerKey || playerId.toString(),
      row_number: index + 1
    }
  } catch (error) {
    console.error(`❌ Error processing player ${index + 1}:`, error.message)
    return null
  }
}

async function main() {
  try {
    console.log('🔑 Using stored access token from yahoo-tokens.json')
    
    // Try to get a batch of players using the approach that worked before
    const result = await fetchYahooPlayersBatch(0, 100)
    
    if (result.players.length === 0) {
      console.error('❌ No players found with any approach')
      console.log('💡 The API structure might have changed, or we need different credentials')
      return
    }
    
    console.log(`✅ Found ${result.players.length} players using format: ${result.format}`)
    
    // Process all players
    const processedPlayers = result.players
      .map((playerData, index) => processPlayer(playerData, index))
      .filter(Boolean)
    
    console.log(`✅ Successfully processed ${processedPlayers.length} players`)
    console.log(`❌ Skipped ${result.players.length - processedPlayers.length} invalid entries`)
    
    if (processedPlayers.length === 0) {
      console.error('❌ No valid players found after processing')
      return
    }
    
    // Show statistics
    const stats = {
      totalPlayers: processedPlayers.length,
      playersWithTeams: processedPlayers.filter(p => p.yahoo_team_abbr).length,
      playersWithPositions: processedPlayers.filter(p => p.yahoo_positions).length,
      uniqueTeams: new Set(processedPlayers.map(p => p.yahoo_team_abbr).filter(Boolean)).size,
      uniqueNames: new Set(processedPlayers.map(p => p.yahoo_name_full?.toLowerCase()).filter(Boolean)).size
    }
    
    console.log('\n📈 Yahoo Player Statistics:')
    console.log(`- Total players: ${stats.totalPlayers}`)
    console.log(`- Players with teams: ${stats.playersWithTeams}`)
    console.log(`- Players with positions: ${stats.playersWithPositions}`)
    console.log(`- Unique teams: ${stats.uniqueTeams}`)
    console.log(`- Unique names: ${stats.uniqueNames}`)
    
    // Show sample players
    console.log('\n👥 Sample players:')
    processedPlayers.slice(0, 10).forEach(player => {
      console.log(`- ${player.yahoo_name_full} (${player.yahoo_player_id}) [${player.yahoo_team_abbr || 'No Team'}] (${player.yahoo_positions || 'No Pos'})`)
    })
    
    // Save processed data
    const outputData = {
      metadata: {
        processedAt: new Date().toISOString(),
        sourceAPI: 'Yahoo Fantasy API (Batch Approach)',
        totalProcessed: processedPlayers.length,
        totalSkipped: result.players.length - processedPlayers.length,
        successfulFormat: result.format,
        stats
      },
      players: processedPlayers
    }
    
    fs.writeFileSync('./yahoo-players-processed.json', JSON.stringify(outputData, null, 2))
    console.log(`\n💾 Saved ${processedPlayers.length} players to: yahoo-players-processed.json`)
    
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