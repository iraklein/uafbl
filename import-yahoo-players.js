#!/usr/bin/env node

/**
 * Yahoo Fantasy API Player Import Script
 * Fetches all players from Yahoo Fantasy API and prepares them for matching
 * 
 * Usage: node import-yahoo-players.js
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// Configuration
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET
const OUTPUT_FILE = './yahoo-players-processed.json'

// Yahoo Fantasy API endpoints
const YAHOO_AUTH_URL = 'https://api.login.yahoo.com/oauth2/get_token'
const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2'

// Generate OAuth 1.0 signature for 2-legged requests
const crypto = require('crypto')

function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret = '') {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')
  
  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`
  
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')
}

function generateOAuthHeader(method, url, consumerKey, consumerSecret) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(16).toString('hex')
  
  const params = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_version: '1.0'
  }
  
  const signature = generateOAuthSignature(method, url, params, consumerSecret)
  params.oauth_signature = signature
  
  const authHeader = 'OAuth ' + Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(params[key])}"`)
    .join(', ')
  
  return authHeader
}

// Fetch players from Yahoo API
async function fetchYahooPlayers(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      port: 443,
      path: '/fantasy/v2/league/nba.l.12345/players?format=json&start=0&count=1000', // Adjust league key as needed
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          resolve(response)
        } catch (error) {
          reject(new Error(`Failed to parse players response: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

// Use Yahoo's public player data API with 2-legged OAuth
async function fetchPublicYahooPlayers() {
  return new Promise((resolve, reject) => {
    const url = 'https://fantasysports.yahooapis.com/fantasy/v2/game/nba/players'
    const fullUrl = `${url}?format=json&start=0&count=2000`
    
    const authHeader = generateOAuthHeader('GET', fullUrl, YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET)
    
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      port: 443,
      path: '/fantasy/v2/game/nba/players?format=json&start=0&count=2000',
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'User-Agent': 'UAFBL-Player-Import/1.0'
      }
    }

    console.log('🔑 Using OAuth 1.0 2-legged authentication')
    console.log('📡 Requesting:', fullUrl)

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        console.log(`📊 Response status: ${res.statusCode}`)
        try {
          if (res.statusCode === 200) {
            const response = JSON.parse(data)
            resolve(response)
          } else {
            console.log('❌ Error response:', data.substring(0, 500))
            reject(new Error(`Yahoo API returned ${res.statusCode}: ${data}`))
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

function main() {
  console.log('🏀 Yahoo Fantasy Player Import Script')
  console.log('====================================')
  
  if (!YAHOO_CLIENT_ID || !YAHOO_CLIENT_SECRET) {
    console.error('❌ Yahoo API credentials not found in environment variables')
    console.log('Please ensure YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET are set')
    process.exit(1)
  }
  
  console.log('🔐 Yahoo API credentials found')
  console.log('📡 Fetching players from Yahoo Fantasy API...')
  
  // Try public API with OAuth 1.0 2-legged authentication
  fetchPublicYahooPlayers()
    .then(response => {
      console.log('✅ Successfully fetched data from Yahoo API')
      console.log('🔍 Parsing player data...')
      
      // Parse the Yahoo response structure
      let players = []
      
      try {
        // Yahoo API response structure: fantasy_content.game[0].players[0].player[]
        if (response.fantasy_content && response.fantasy_content.game) {
          const game = Array.isArray(response.fantasy_content.game) 
            ? response.fantasy_content.game[0] 
            : response.fantasy_content.game
          
          if (game.players && game.players[0] && game.players[0].player) {
            players = game.players[0].player
          }
        }
        
        if (players.length === 0) {
          console.log('⚠️ No players found in API response')
          console.log('Response structure:', JSON.stringify(response, null, 2).substring(0, 500) + '...')
          
          // Skip authenticated API for now and return empty result
          console.log('⚠️ Skipping authenticated API due to credential issues')
          return Promise.resolve({ players: [], fromPublicAPI: true })
        }
        
        return Promise.resolve({ players, fromPublicAPI: true })
      } catch (parseError) {
        console.error('❌ Error parsing public API response:', parseError.message)
        console.log('⚠️ Skipping authenticated API due to credential issues')
        return Promise.resolve({ players: [], fromPublicAPI: true })
      }
    })
    .then(result => {
      let players = result.players || result
      
      console.log(`📊 Found ${players.length} players from Yahoo API`)
      
      if (players.length === 0) {
        console.error('❌ No players found')
        process.exit(1)
      }
      
      // Log first few entries to understand structure
      console.log('\\n🔍 Sample player data:')
      players.slice(0, 3).forEach((player, index) => {
        console.log(`Player ${index + 1}:`, JSON.stringify(player, null, 2).substring(0, 200) + '...')
      })
      
      // Process and normalize the data
      const processedPlayers = players
        .map((playerData, index) => {
          try {
            // Yahoo API structure varies, need to handle different formats
            const player = playerData[0] || playerData.player?.[0] || playerData
            
            if (!player) {
              console.warn(`⚠️ Player ${index + 1}: No valid player data`)
              return null
            }
            
            // Extract player information
            const playerId = player.player_id || player.player_key
            const name = player.name?.full || player.full_name || player.name
            const firstName = player.name?.first || player.first_name
            const lastName = player.name?.last || player.last_name
            const team = player.editorial_team_abbr || player.team_abbr
            const positions = Array.isArray(player.eligible_positions?.position) 
              ? player.eligible_positions.position.map(p => p.position || p).join(',')
              : player.position || player.positions
            
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
              yahoo_player_key: player.player_key || playerId.toString(),
              original_data: player, // Keep original for debugging
              row_number: index + 1
            }
          } catch (error) {
            console.error(`❌ Error processing player ${index + 1}:`, error.message)
            return null
          }
        })
        .filter(Boolean) // Remove null entries
      
      console.log(`\\n✅ Processed ${processedPlayers.length} valid Yahoo players`)
      console.log(`❌ Skipped ${players.length - processedPlayers.length} invalid entries`)
      
      if (processedPlayers.length === 0) {
        console.error('❌ No valid players found after processing')
        process.exit(1)
      }
      
      // Show some statistics
      const stats = {
        totalPlayers: processedPlayers.length,
        playersWithTeams: processedPlayers.filter(p => p.yahoo_team_abbr).length,
        playersWithPositions: processedPlayers.filter(p => p.yahoo_positions).length,
        uniqueTeams: new Set(processedPlayers.map(p => p.yahoo_team_abbr).filter(Boolean)).size,
        uniqueNames: new Set(processedPlayers.map(p => p.yahoo_name_full?.toLowerCase()).filter(Boolean)).size
      }
      
      console.log('\\n📈 Yahoo Player Statistics:')
      console.log(`- Total players: ${stats.totalPlayers}`)
      console.log(`- Players with teams: ${stats.playersWithTeams}`)
      console.log(`- Players with positions: ${stats.playersWithPositions}`)
      console.log(`- Unique teams: ${stats.uniqueTeams}`)
      console.log(`- Unique names: ${stats.uniqueNames}`)
      
      // Check for duplicates
      const nameCounts = {}
      processedPlayers.forEach(player => {
        const name = player.yahoo_name_full?.toLowerCase()
        if (name) {
          nameCounts[name] = (nameCounts[name] || 0) + 1
        }
      })
      
      const duplicateNames = Object.entries(nameCounts)
        .filter(([name, count]) => count > 1)
        .map(([name, count]) => ({ name, count }))
      
      if (duplicateNames.length > 0) {
        console.log('\\n⚠️ Duplicate player names found:')
        duplicateNames.slice(0, 10).forEach(({ name, count }) => {
          console.log(`- ${name}: ${count} entries`)
        })
        if (duplicateNames.length > 10) {
          console.log(`  ... and ${duplicateNames.length - 10} more`)
        }
      }
      
      // Save processed data
      const outputData = {
        metadata: {
          processedAt: new Date().toISOString(),
          sourceAPI: result.fromPublicAPI ? 'Yahoo Public API' : 'Yahoo Authenticated API',
          totalProcessed: processedPlayers.length,
          totalSkipped: players.length - processedPlayers.length,
          stats
        },
        players: processedPlayers
      }
      
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2))
      console.log(`\\n💾 Saved processed data to: ${OUTPUT_FILE}`)
      
      console.log('\\n🎯 Next Steps:')
      console.log('1. Review the processed data in yahoo-players-processed.json')
      console.log('2. Run the matching script: node match-yahoo-players.js')
      console.log('3. Create any missing players: node create-missing-yahoo-players.js')
    })
    .catch(error => {
      console.error('❌ Error importing Yahoo players:', error.message)
      process.exit(1)
    })
}

if (require.main === module) {
  main()
}