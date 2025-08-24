#!/usr/bin/env node

/**
 * Search Missing Yahoo Players
 * Searches Yahoo Fantasy API for all players without Yahoo IDs
 * 
 * Usage: node search-missing-yahoo-players.js [--dry-run] [--limit=N]
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const fs = require('fs')

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjhrwwxvwqwmsjvelgrv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4'

const isDryRun = process.argv.includes('--dry-run')
const limitArg = process.argv.find(arg => arg.startsWith('--limit='))
const searchLimit = limitArg ? parseInt(limitArg.split('=')[1]) : null

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

// Check if we have tokens
if (!fs.existsSync('./yahoo-tokens.json')) {
  console.error('❌ No Yahoo tokens found. Please run yahoo-get-token.js first.')
  process.exit(1)
}

const tokens = JSON.parse(fs.readFileSync('./yahoo-tokens.json', 'utf8'))

// Yahoo API search function
async function searchYahooPlayer(playerName) {
  return new Promise((resolve) => {
    // Clean player name for search
    const cleanName = playerName
      .replace(/[.,'"]/g, '') // Remove punctuation
      .replace(/\s+/g, '+') // Replace spaces with +
      .trim()

    // Search in current NBA game (466) for players
    const path = `/fantasy/v2/game/466/players;search=${encodeURIComponent(cleanName)};count=10?format=json`
    
    const options = {
      hostname: 'fantasysports.yahooapis.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; UAFBL-Search/1.0)'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data)
            const players = parseYahooSearchResponse(response)
            resolve({ success: true, players, statusCode: res.statusCode })
          } catch (error) {
            resolve({ success: false, error: error.message, statusCode: res.statusCode })
          }
        } else {
          resolve({ success: false, error: `HTTP ${res.statusCode}`, statusCode: res.statusCode, data })
        }
      })
    })

    req.on('error', (error) => {
      resolve({ success: false, error: error.message, statusCode: null })
    })
    
    req.setTimeout(10000, () => {
      req.destroy()
      resolve({ success: false, error: 'Timeout', statusCode: null })
    })
    
    req.end()
  })
}

function parseYahooSearchResponse(response) {
  const players = []
  
  try {
    const content = response.fantasy_content
    if (content && content.game) {
      const games = Array.isArray(content.game) ? content.game : [content.game]
      
      for (const game of games) {
        if (game.players && game.players[0] && game.players[0].player) {
          const playersList = game.players[0].player
          const playersArray = Array.isArray(playersList) ? playersList : [playersList]
          
          playersArray.forEach(playerData => {
            let player = {}
            
            if (Array.isArray(playerData)) {
              playerData.forEach(obj => Object.assign(player, obj))
            } else {
              player = playerData
            }
            
            if (player.player_id && player.name?.full) {
              players.push({
                yahoo_player_id: player.player_id.toString(),
                yahoo_name_full: player.name.full,
                yahoo_first_name: player.name.first || null,
                yahoo_last_name: player.name.last || null,
                yahoo_team_abbr: player.editorial_team_abbr || null,
                yahoo_positions: player.eligible_positions ? 
                  (Array.isArray(player.eligible_positions) ? 
                    player.eligible_positions.map(pos => typeof pos === 'object' ? pos.position : pos).join(',') :
                    player.eligible_positions) : null,
                yahoo_player_key: player.player_key || player.player_id.toString()
              })
            }
          })
        }
      }
    }
  } catch (error) {
    console.error('Parse error:', error.message)
  }
  
  return players
}

async function getAllPlayersWithoutYahooId() {
  console.log('📖 Fetching players without Yahoo IDs from database...')
  
  let allPlayers = []
  let page = 0
  const pageSize = 1000
  let hasMore = true
  
  while (hasMore) {
    const { data: players, error } = await supabase
      .from('players')
      .select('id, name, yahoo_player_id, data_source')
      .is('yahoo_player_id', null)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('name')
    
    if (error) {
      throw new Error(`Database error on page ${page + 1}: ${error.message}`)
    }
    
    allPlayers = [...allPlayers, ...players]
    hasMore = players.length === pageSize
    page++
  }
  
  console.log(`📊 Total players without Yahoo IDs: ${allPlayers.length}`)
  return allPlayers
}

function normalizePlayerName(name) {
  return name.toLowerCase()
    .replace(/[.''-]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/jr\.?$|sr\.?$|iii?$|iv$|junior$|senior$/, '') // Remove suffixes
    .replace(/\biii\b/, '') // Remove III anywhere
    .trim()
}

function calculateNameSimilarity(name1, name2) {
  const n1 = normalizePlayerName(name1)
  const n2 = normalizePlayerName(name2)
  
  // Exact match
  if (n1 === n2) return 1.0
  
  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 0.95
  
  // Word overlap calculation
  const words1 = n1.split(' ')
  const words2 = n2.split(' ')
  const overlap = words1.filter(word => words2.includes(word)).length
  
  return overlap / Math.max(words1.length, words2.length)
}

async function main() {
  console.log('🔍 Search Missing Yahoo Players')
  console.log('===============================')
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
  }
  
  if (searchLimit) {
    console.log(`📊 Limited to searching ${searchLimit} players`)
  }
  
  try {
    // Get all players without Yahoo IDs
    const playersWithoutYahoo = await getAllPlayersWithoutYahooId()
    
    if (playersWithoutYahoo.length === 0) {
      console.log('✅ All players already have Yahoo IDs!')
      return
    }
    
    // Limit search if specified
    const playersToSearch = searchLimit ? 
      playersWithoutYahoo.slice(0, searchLimit) : 
      playersWithoutYahoo
    
    console.log(`\n🔎 Searching Yahoo Fantasy API for ${playersToSearch.length} players...\n`)
    
    const results = {
      found: [],
      notFound: [],
      errors: [],
      multipleMatches: []
    }
    
    let searchCount = 0
    
    for (const player of playersToSearch) {
      searchCount++
      console.log(`[${searchCount}/${playersToSearch.length}] Searching: "${player.name}"`)
      
      try {
        const searchResult = await searchYahooPlayer(player.name)
        
        if (searchResult.success && searchResult.players.length > 0) {
          // Find best match
          let bestMatch = null
          let bestScore = 0
          
          searchResult.players.forEach(yahooPlayer => {
            const similarity = calculateNameSimilarity(player.name, yahooPlayer.yahoo_name_full)
            if (similarity > bestScore) {
              bestScore = similarity
              bestMatch = yahooPlayer
            }
          })
          
          if (bestScore >= 0.8) {
            console.log(`  ✅ Found: ${bestMatch.yahoo_name_full} (ID: ${bestMatch.yahoo_player_id}) [${(bestScore * 100).toFixed(1)}% match]`)
            results.found.push({
              uafblPlayer: player,
              yahooPlayer: bestMatch,
              similarity: bestScore,
              allMatches: searchResult.players
            })
            
            if (searchResult.players.length > 1) {
              console.log(`    📝 Note: ${searchResult.players.length} total matches found`)
            }
          } else {
            console.log(`  ⚠️ Weak match: ${bestMatch.yahoo_name_full} (ID: ${bestMatch.yahoo_player_id}) [${(bestScore * 100).toFixed(1)}% match]`)
            results.multipleMatches.push({
              uafblPlayer: player,
              matches: searchResult.players,
              bestSimilarity: bestScore
            })
          }
        } else {
          console.log(`  ❌ Not found`)
          results.notFound.push({
            uafblPlayer: player,
            error: searchResult.error || 'No matches'
          })
        }
        
        // Rate limiting - small delay between requests
        if (searchCount % 10 === 0) {
          console.log(`  💤 Brief pause after ${searchCount} searches...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`)
        results.errors.push({
          uafblPlayer: player,
          error: error.message
        })
      }
    }
    
    console.log('\n📊 Search Results Summary:')
    console.log(`✅ Found matches: ${results.found.length}`)
    console.log(`⚠️ Weak/multiple matches: ${results.multipleMatches.length}`)
    console.log(`❌ Not found: ${results.notFound.length}`)
    console.log(`💥 Errors: ${results.errors.length}`)
    
    // Show detailed results
    if (results.found.length > 0) {
      console.log('\n🎯 Strong Matches Found:')
      results.found.forEach((result, index) => {
        console.log(`${index + 1}. "${result.uafblPlayer.name}" (ID: ${result.uafblPlayer.id})`)
        console.log(`   -> Yahoo: "${result.yahooPlayer.yahoo_name_full}" (Yahoo ID: ${result.yahooPlayer.yahoo_player_id})`)
        console.log(`   -> Team: ${result.yahooPlayer.yahoo_team_abbr || 'N/A'} | Positions: ${result.yahooPlayer.yahoo_positions || 'N/A'}`)
        console.log(`   -> Similarity: ${(result.similarity * 100).toFixed(1)}%`)
      })
    }
    
    if (results.multipleMatches.length > 0) {
      console.log('\n⚠️ Multiple/Weak Matches (Need Manual Review):')
      results.multipleMatches.slice(0, 10).forEach((result, index) => {
        console.log(`${index + 1}. "${result.uafblPlayer.name}" (ID: ${result.uafblPlayer.id})`)
        result.matches.slice(0, 3).forEach(match => {
          const similarity = calculateNameSimilarity(result.uafblPlayer.name, match.yahoo_name_full)
          console.log(`   -> ${match.yahoo_name_full} (${match.yahoo_player_id}) [${(similarity * 100).toFixed(1)}%]`)
        })
      })
      if (results.multipleMatches.length > 10) {
        console.log(`   ... and ${results.multipleMatches.length - 10} more`)
      }
    }
    
    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `yahoo-search-results-${timestamp}.json`
    
    const output = {
      metadata: {
        searchedAt: new Date().toISOString(),
        totalSearched: searchCount,
        totalWithoutYahoo: playersWithoutYahoo.length,
        searchLimit: searchLimit || 'none'
      },
      results
    }
    
    fs.writeFileSync(filename, JSON.stringify(output, null, 2))
    console.log(`\n💾 Results saved to: ${filename}`)
    
    if (results.found.length > 0 && !isDryRun) {
      console.log('\n🎯 Next Steps:')
      console.log('1. Review the strong matches above')
      console.log('2. Use the admin interface to add Yahoo IDs for confirmed matches')
      console.log('3. The auto-populate system will handle the rest!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()