#!/usr/bin/env node

/**
 * Yahoo Fantasy Player Import using Official Library
 * This recreates the working approach from before
 */

const YahooFantasy = require('yahoo-fantasy')
const fs = require('fs')

// Configuration
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID || 'dj0yJmk9cEtMdnI3cE56bmFhJmQ9WVdrOVYySk5hMDAwVVhNbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PWZh'
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET || 'b656ac05b9263cb24bf13892ebe46c4a91772aa8'

console.log('🏀 Yahoo Fantasy Player Import (Library Method)')
console.log('===============================================')

// Token callback to save/load tokens
const tokenCallback = ({ access_token, refresh_token }) => {
  const tokens = {
    access_token,
    refresh_token,
    expires_in: 3600,
    created_at: new Date().toISOString()
  }
  
  fs.writeFileSync('./yahoo-tokens.json', JSON.stringify(tokens, null, 2))
  console.log('💾 Tokens saved/updated')
  
  return Promise.resolve()
}

// Initialize Yahoo Fantasy client
const yf = new YahooFantasy(
  YAHOO_CLIENT_ID,
  YAHOO_CLIENT_SECRET,
  tokenCallback
)

async function loadExistingTokens() {
  try {
    if (fs.existsSync('./yahoo-tokens.json')) {
      const tokens = JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'))
      console.log('🔑 Loading existing tokens...')
      
      // Set tokens in the library
      yf.setUserToken(tokens.access_token, tokens.refresh_token)
      return true
    }
  } catch (error) {
    console.log('⚠️ Could not load existing tokens:', error.message)
  }
  return false
}

async function main() {
  try {
    console.log('🔐 Yahoo Fantasy credentials found')
    
    // Try to load existing tokens
    const hasTokens = await loadExistingTokens()
    
    if (!hasTokens) {
      console.error('❌ No valid tokens found')
      console.log('Please run the authentication flow first')
      return
    }
    
    console.log('🏀 Fetching NBA games...')
    
    // Get NBA games
    const games = await yf.games.fetch('nba')
    console.log(`📊 Found ${games.length} NBA games`)
    
    if (games.length === 0) {
      console.error('❌ No NBA games found')
      return
    }
    
    // Use the current NBA game (should be 2024-25 season)
    const nbaGame = games[0]
    console.log(`🏀 Using game: ${nbaGame.name} (${nbaGame.code}) - Season ${nbaGame.season}`)
    
    console.log('👥 Fetching all NBA players...')
    
    // This is the key method that should return ALL players
    const allPlayers = await yf.game.players(nbaGame.game_key)
    
    console.log(`📊 Retrieved ${allPlayers.length} players from Yahoo Fantasy API`)
    
    if (allPlayers.length === 0) {
      console.error('❌ No players returned from API')
      return
    }
    
    // Process players into our format
    console.log('🔍 Processing player data...')
    
    const processedPlayers = allPlayers.map((player, index) => {
      // Handle different possible data structures
      let positions = null
      if (player.eligible_positions) {
        if (Array.isArray(player.eligible_positions)) {
          positions = player.eligible_positions.map(pos => {
            return typeof pos === 'object' ? pos.position : pos
          }).join(',')
        } else {
          positions = player.eligible_positions
        }
      }
      
      return {
        yahoo_player_id: player.player_id.toString(),
        yahoo_name_full: player.name.full.trim(),
        yahoo_first_name: player.name.first?.trim() || null,
        yahoo_last_name: player.name.last?.trim() || null,
        yahoo_team_abbr: player.editorial_team_abbr || null,
        yahoo_positions: positions || null,
        yahoo_player_key: player.player_key,
        row_number: index + 1
      }
    })
    
    console.log(`✅ Successfully processed ${processedPlayers.length} players`)
    
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
    processedPlayers.slice(0, 15).forEach(player => {
      console.log(`- ${player.yahoo_name_full} (${player.yahoo_player_id}) [${player.yahoo_team_abbr || 'FA'}] (${player.yahoo_positions || 'No Pos'})`)
    })
    
    // Save processed data
    const outputData = {
      metadata: {
        processedAt: new Date().toISOString(),
        sourceAPI: 'Yahoo Fantasy Library',
        gameUsed: nbaGame,
        totalProcessed: processedPlayers.length,
        totalSkipped: 0,
        stats
      },
      players: processedPlayers
    }
    
    fs.writeFileSync('./yahoo-players-processed.json', JSON.stringify(outputData, null, 2))
    console.log(`\n💾 Saved all ${processedPlayers.length} players to: yahoo-players-processed.json`)
    
    console.log('\n🎯 Next Steps:')
    console.log('1. Review the processed data in yahoo-players-processed.json')
    console.log('2. Run the matching script: node match-yahoo-players.js --dry-run')
    console.log('3. If everything looks good, run: node match-yahoo-players.js')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    
    if (error.message.includes('401') || error.message.includes('authentication')) {
      console.log('\n🔄 Authentication may have expired. Try:')
      console.log('1. Get fresh authorization: node yahoo-auth-simple.js')
      console.log('2. Exchange for tokens: node yahoo-get-token.js <code>')
      console.log('3. Run this script again')
    } else {
      console.error('Stack:', error.stack)
    }
  }
}

main()