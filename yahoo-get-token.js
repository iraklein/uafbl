#!/usr/bin/env node

/**
 * Yahoo Fantasy Token Exchange
 * Exchanges authorization code for access token and fetches players
 */

const https = require('https')
const querystring = require('querystring')
const fs = require('fs')

const authCode = process.argv[2]
if (!authCode) {
  console.error('❌ Please provide the authorization code')
  console.log('Usage: node yahoo-get-token.js <authorization_code>')
  process.exit(1)
}

// Configuration
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID || 'dj0yJmk9cEtMdnI3cE56bmFhJmQ9WVdrOVYySk5hMDAwVVhNbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PWZh'
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET || 'b656ac05b9263cb24bf13892ebe46c4a91772aa8'

console.log('🏀 Exchanging Authorization Code for Access Token')
console.log('=================================================')

// Exchange authorization code for access token
async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      client_id: YAHOO_CLIENT_ID,
      client_secret: YAHOO_CLIENT_SECRET,
      redirect_uri: 'oob',
      code: authCode,
      grant_type: 'authorization_code'
    })

    const options = {
      hostname: 'api.login.yahoo.com',
      port: 443,
      path: '/oauth2/get_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
    }

    console.log('🔑 Requesting access token...')

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        console.log(`📊 Response status: ${res.statusCode}`)
        try {
          const response = JSON.parse(data)
          if (response.access_token) {
            console.log('✅ Successfully obtained access token!')
            resolve(response)
          } else {
            console.log('❌ Error response:', data)
            reject(new Error(`Token exchange failed: ${data}`))
          }
        } catch (error) {
          reject(new Error(`Failed to parse token response: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

// Fetch Yahoo Fantasy players
async function fetchYahooPlayers(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      port: 443,
      path: '/fantasy/v2/game/466/players?format=json&start=0&count=100', // Start with 100 to test
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }

    console.log('🏀 Fetching NBA players from Yahoo Fantasy API...')

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        console.log(`📊 Players API response status: ${res.statusCode}`)
        try {
          if (res.statusCode === 200) {
            const response = JSON.parse(data)
            resolve(response)
          } else {
            console.log('❌ Error response:', data.substring(0, 500))
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

async function main() {
  try {
    // Step 1: Get access token
    const tokenResponse = await getAccessToken()
    
    // Save tokens for future use
    const tokens = {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_in: tokenResponse.expires_in,
      created_at: new Date().toISOString()
    }
    
    fs.writeFileSync('./yahoo-tokens.json', JSON.stringify(tokens, null, 2))
    console.log('💾 Tokens saved to yahoo-tokens.json')
    
    // Step 2: Fetch players
    const playersResponse = await fetchYahooPlayers(tokenResponse.access_token)
    
    console.log('✅ Successfully fetched player data!')
    console.log('🔍 Parsing player data...')
    
    // Parse Yahoo API response structure
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
      
      console.log(`📊 Found ${players.length} players from Yahoo API`)
      
      if (players.length === 0) {
        console.log('⚠️ No players found in API response')
        console.log('Response structure sample:', JSON.stringify(playersResponse, null, 2).substring(0, 1000) + '...')
        return
      }
      
      // Process and normalize the data
      const processedPlayers = players
        .map((playerData, index) => {
          try {
            // Yahoo API structure: each player is an array of objects with single properties
            // playerData is like: [{"player_key": "466.p.5352"}, {"player_id": "5352"}, {"name": {...}}, ...]
            
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
              console.log('Player structure:', JSON.stringify(player, null, 2).substring(0, 300))
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
            console.log('Player data:', JSON.stringify(playerData, null, 2).substring(0, 300))
            return null
          }
        })
        .filter(Boolean) // Remove null entries
      
      console.log(`✅ Processed ${processedPlayers.length} valid Yahoo players`)
      console.log(`❌ Skipped ${players.length - processedPlayers.length} invalid entries`)
      
      if (processedPlayers.length === 0) {
        console.error('❌ No valid players found after processing')
        return
      }
      
      // Show some statistics
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
      
      // Save processed data
      const outputData = {
        metadata: {
          processedAt: new Date().toISOString(),
          sourceAPI: 'Yahoo Fantasy API (OAuth2)',
          totalProcessed: processedPlayers.length,
          totalSkipped: players.length - processedPlayers.length,
          stats
        },
        players: processedPlayers
      }
      
      fs.writeFileSync('./yahoo-players-processed.json', JSON.stringify(outputData, null, 2))
      console.log(`\n💾 Saved processed data to: yahoo-players-processed.json`)
      
      console.log('\n🎯 Next Steps:')
      console.log('1. Review the processed data in yahoo-players-processed.json')
      console.log('2. Run the matching script: node match-yahoo-players.js --dry-run')
      console.log('3. If everything looks good, run: node match-yahoo-players.js')
      
    } catch (parseError) {
      console.error('❌ Error parsing player data:', parseError.message)
      console.log('Raw response sample:', JSON.stringify(playersResponse, null, 2).substring(0, 1000) + '...')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()