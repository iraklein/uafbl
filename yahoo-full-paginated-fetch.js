#!/usr/bin/env node

/**
 * Yahoo Fantasy Complete Player Import
 * Uses pagination to get ALL Yahoo players (discovered working method!)
 */

const https = require('https')
const fs = require('fs')

// Check if we have tokens
if (!fs.existsSync('./yahoo-tokens.json')) {
  console.error('❌ No tokens found. Please run yahoo-get-token.js first.')
  process.exit(1)
}

const tokens = JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'))

console.log('🏀 Yahoo Fantasy Complete Player Import')
console.log('======================================')

// The working endpoint we discovered
const WORKING_ENDPOINT = '/fantasy/v2/game/466/players?format=json&count=25&start={START}'

async function fetchPlayersPage(start) {
  return new Promise((resolve) => {
    const path = WORKING_ENDPOINT.replace('{START}', start)
    
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

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data)
            resolve({ success: true, data: response })
          } catch (error) {
            resolve({ success: false, error: error.message })
          }
        } else {
          resolve({ success: false, error: `HTTP ${res.statusCode}` })
        }
      })
    })

    req.on('error', (error) => {
      resolve({ success: false, error: error.message })
    })
    
    req.end()
  })
}

function parsePlayersFromResponse(response) {
  let players = []
  
  try {
    const content = response.fantasy_content
    if (content && content.game) {
      const games = Array.isArray(content.game) ? content.game : [content.game]
      for (const game of games) {
        if (game.players && game.players[0] && game.players[0].player) {
          players = game.players[0].player
          break
        }
      }
    }
  } catch (error) {
    console.error('❌ Parse error:', error.message)
  }
  
  return players
}

function processPlayer(playerData, globalIndex) {
  try {
    if (!Array.isArray(playerData)) return null
    
    const player = {}
    playerData.forEach(obj => Object.assign(player, obj))
    
    const playerId = player.player_id
    const playerKey = player.player_key
    const name = player.name?.full
    const firstName = player.name?.first
    const lastName = player.name?.last
    const team = player.editorial_team_abbr
    
    let positions = null
    if (player.eligible_positions && Array.isArray(player.eligible_positions)) {
      positions = player.eligible_positions.map(pos => {
        return typeof pos === 'object' ? pos.position : pos
      }).join(',')
    }
    
    if (!playerId || !name) return null
    
    return {
      yahoo_player_id: playerId.toString(),
      yahoo_name_full: name.trim(),
      yahoo_first_name: firstName?.trim() || null,
      yahoo_last_name: lastName?.trim() || null,
      yahoo_team_abbr: team || null,
      yahoo_positions: positions || null,
      yahoo_player_key: playerKey || playerId.toString(),
      row_number: globalIndex + 1
    }
  } catch (error) {
    return null
  }
}

async function main() {
  try {
    console.log('🔑 Using working pagination method')
    console.log(`📡 Endpoint: ${WORKING_ENDPOINT}`)
    
    const allPlayers = []
    const playerIds = new Set() // Track duplicates
    let start = 0
    const pageSize = 25
    let consecutiveErrors = 0
    let consecutiveEmpty = 0
    const maxPages = 500 // Safety limit (500 * 25 = 12,500 players max)
    
    console.log('\n🚀 Starting bulk player fetch...')
    
    for (let page = 0; page < maxPages; page++) {
      process.stdout.write(`\r📡 Fetching page ${page + 1} (start=${start})...`)
      
      const result = await fetchPlayersPage(start)
      
      if (!result.success) {
        console.log(`\n❌ Error on page ${page + 1}: ${result.error}`)
        consecutiveErrors++
        
        if (consecutiveErrors >= 3) {
          console.log('❌ Too many consecutive errors, stopping')
          break
        }
        
        start += pageSize
        continue
      }
      
      // Reset error counter on success
      consecutiveErrors = 0
      
      const players = parsePlayersFromResponse(result.data)
      
      if (players.length === 0) {
        consecutiveEmpty++
        
        if (consecutiveEmpty >= 5) {
          console.log(`\n📊 No players found for ${consecutiveEmpty} consecutive pages, stopping`)
          break
        }
        
        start += pageSize
        continue
      }
      
      // Reset empty counter when we find players
      consecutiveEmpty = 0
      
      // Process players and check for duplicates
      let newPlayers = 0
      let duplicates = 0
      
      players.forEach(playerData => {
        const player = processPlayer(playerData, allPlayers.length + newPlayers)
        if (player) {
          if (playerIds.has(player.yahoo_player_id)) {
            duplicates++
          } else {
            playerIds.add(player.yahoo_player_id)
            allPlayers.push(player)
            newPlayers++
          }
        }
      })
      
      console.log(`\n✅ Page ${page + 1}: ${newPlayers} new players (${duplicates} duplicates)`)
      
      // Small delay to be respectful to Yahoo's API
      await new Promise(resolve => setTimeout(resolve, 100))
      
      start += pageSize
    }
    
    console.log(`\n🎯 Collection Complete!`)
    console.log(`📊 Total unique players collected: ${allPlayers.length}`)
    
    if (allPlayers.length === 0) {
      console.error('❌ No players collected')
      return
    }
    
    // Final statistics
    const stats = {
      totalPlayers: allPlayers.length,
      playersWithTeams: allPlayers.filter(p => p.yahoo_team_abbr).length,
      playersWithPositions: allPlayers.filter(p => p.yahoo_positions).length,
      uniqueTeams: new Set(allPlayers.map(p => p.yahoo_team_abbr).filter(Boolean)).size,
      uniqueNames: new Set(allPlayers.map(p => p.yahoo_name_full?.toLowerCase()).filter(Boolean)).size
    }
    
    console.log('\n📈 Final Yahoo Player Statistics:')
    console.log(`- Total players: ${stats.totalPlayers}`)
    console.log(`- Players with teams: ${stats.playersWithTeams}`)
    console.log(`- Players with positions: ${stats.playersWithPositions}`)
    console.log(`- Unique teams: ${stats.uniqueTeams}`)
    console.log(`- Unique names: ${stats.uniqueNames}`)
    
    // Show sample players
    console.log('\n👥 Sample players:')
    allPlayers.slice(0, 20).forEach(player => {
      console.log(`- ${player.yahoo_name_full} (${player.yahoo_player_id}) [${player.yahoo_team_abbr || 'FA'}] (${player.yahoo_positions || 'No Pos'})`)
    })
    
    // Save all data
    const outputData = {
      metadata: {
        processedAt: new Date().toISOString(),
        sourceAPI: 'Yahoo Fantasy API (Complete Pagination)',
        workingEndpoint: WORKING_ENDPOINT,
        totalProcessed: allPlayers.length,
        totalSkipped: 0,
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
  }
}

main()