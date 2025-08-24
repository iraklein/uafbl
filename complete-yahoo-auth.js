#!/usr/bin/env node

/**
 * Complete Yahoo Fantasy OAuth
 * Completes the OAuth flow and fetches players
 * 
 * Usage: node complete-yahoo-auth.js <authorization_code>
 */

const YahooFantasy = require('yahoo-fantasy')
const fs = require('fs')

const authCode = process.argv[2]
if (!authCode) {
  console.error('❌ Please provide the authorization code')
  console.log('Usage: node complete-yahoo-auth.js <authorization_code>')
  process.exit(1)
}

// Configuration
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID || 'dj0yJmk9cEtMdnI3cE56bmFhJmQ9WVdrOVYySk5hMDAwVVhNbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PWZh'
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET || 'b656ac05b9263cb24bf13892ebe46c4a91772aa8'

console.log('🏀 Completing Yahoo Fantasy OAuth')
console.log('===================================')

// Initialize Yahoo Fantasy client
const yf = new YahooFantasy(
  YAHOO_CLIENT_ID,
  YAHOO_CLIENT_SECRET,
  ({ access_token, refresh_token }) => {
    const tokens = {
      access_token,
      refresh_token,
      created_at: new Date().toISOString()
    }
    
    fs.writeFileSync('./yahoo-tokens.json', JSON.stringify(tokens, null, 2))
    console.log('✅ Tokens saved to yahoo-tokens.json')
    
    return Promise.resolve()
  }
)

async function completeAuth() {
  try {
    console.log('🔑 Exchanging authorization code for tokens...')
    
    // Complete the authorization flow
    await new Promise((resolve, reject) => {
      yf.authCallback({ query: { code: authCode } }, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
    
    console.log('✅ Authorization completed successfully!')
    
    // Now try to fetch NBA games to test the connection
    console.log('🏀 Testing API connection by fetching NBA games...')
    
    const games = await yf.games.fetch('nba')
    console.log('✅ Successfully connected to Yahoo Fantasy API!')
    console.log('📊 Available NBA games:', games.length)
    
    if (games.length > 0) {
      console.log('🔍 Fetching players for the current NBA season...')
      
      // Get the current NBA game
      const nbaGame = games[0]
      console.log(`🏀 Using game: ${nbaGame.name} (${nbaGame.code})`)
      
      // Fetch all players
      const players = await yf.game.players(nbaGame.game_key)
      console.log(`📊 Found ${players.length} players`)
      
      // Process and save players
      const processedPlayers = players.map((player, index) => ({
        yahoo_player_id: player.player_id.toString(),
        yahoo_player_key: player.player_key,
        yahoo_name_full: player.name.full,
        yahoo_first_name: player.name.first || null,
        yahoo_last_name: player.name.last || null,
        yahoo_team_abbr: player.editorial_team_abbr || null,
        yahoo_positions: Array.isArray(player.eligible_positions) 
          ? player.eligible_positions.map(p => p.position).join(',')
          : null,
        row_number: index + 1
      }))
      
      // Save to file
      const outputData = {
        metadata: {
          processedAt: new Date().toISOString(),
          sourceAPI: 'Yahoo Fantasy API (Authenticated)',
          totalProcessed: processedPlayers.length,
          totalSkipped: 0,
          gameUsed: nbaGame
        },
        players: processedPlayers
      }
      
      fs.writeFileSync('./yahoo-players-processed.json', JSON.stringify(outputData, null, 2))
      console.log(`✅ Saved ${processedPlayers.length} players to yahoo-players-processed.json`)
      
      console.log('\n🎯 Next steps:')
      console.log('1. Review the player data in yahoo-players-processed.json')
      console.log('2. Run the matching script: node match-yahoo-players.js --dry-run')
      console.log('3. If the dry run looks good, run: node match-yahoo-players.js')
      
    }
    
  } catch (error) {
    console.error('❌ Error completing authentication:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

completeAuth()