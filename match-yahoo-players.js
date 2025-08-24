#!/usr/bin/env node

/**
 * Match Yahoo Players Script
 * Maps Yahoo players to existing UAFBL players and creates missing ones
 * 
 * Usage: node match-yahoo-players.js [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjhrwwxvwqwmsjvelgrv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4'

const YAHOO_DATA_FILE = './yahoo-players-processed.json'
const isDryRun = process.argv.includes('--dry-run')

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

// Name similarity functions
function normalizePlayerName(name) {
  return name.toLowerCase()
    .replace(/[.''-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/jr\.?$|sr\.?$|iii?$|iv$/, '')
    .trim()
}

function calculateSimilarity(name1, name2) {
  const n1 = normalizePlayerName(name1)
  const n2 = normalizePlayerName(name2)
  
  // Exact match
  if (n1 === n2) return 1.0
  
  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 0.9
  
  // Simple word overlap
  const words1 = n1.split(' ')
  const words2 = n2.split(' ')
  const overlap = words1.filter(word => words2.includes(word)).length
  const maxWords = Math.max(words1.length, words2.length)
  
  return overlap / maxWords
}

async function main() {
  console.log('🏀 Yahoo Player Matching Script')
  console.log('===============================')
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
  }
  
  try {
    // Load Yahoo processed data
    if (!fs.existsSync(YAHOO_DATA_FILE)) {
      console.error(`❌ Yahoo data file not found: ${YAHOO_DATA_FILE}`)
      console.log('Please run: node import-yahoo-players.js first')
      process.exit(1)
    }
    
    console.log(`📖 Reading Yahoo data: ${YAHOO_DATA_FILE}`)
    const yahooData = JSON.parse(fs.readFileSync(YAHOO_DATA_FILE, 'utf8'))
    const yahooPlayers = yahooData.players
    
    console.log(`📊 Found ${yahooPlayers.length} Yahoo players`)
    
    // Get all current players from database (use pagination)
    console.log('📖 Fetching current players from database...')
    let allPlayers = []
    let page = 0
    const pageSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data: players, error } = await supabase
        .from('players')
        .select('id, name, yahoo_player_id, yahoo_name_full, data_source')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('name')
      
      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }
      
      allPlayers = [...allPlayers, ...players]
      hasMore = players.length === pageSize
      page++
    }
    
    console.log(`📊 Found ${allPlayers.length} existing players in database`)
    
    // Create lookup maps
    const playersByYahooId = new Map()
    const playersByName = new Map()
    
    allPlayers.forEach(player => {
      if (player.yahoo_player_id) {
        playersByYahooId.set(player.yahoo_player_id, player)
      }
      
      const normalizedName = normalizePlayerName(player.name)
      if (!playersByName.has(normalizedName)) {
        playersByName.set(normalizedName, [])
      }
      playersByName.get(normalizedName).push(player)
    })
    
    // Process Yahoo players
    const existingMappings = []
    const exactNameMatches = []
    const similarNameMatches = []
    const missingPlayers = []
    
    yahooPlayers.forEach(yahooPlayer => {
      // Check if Yahoo ID already exists
      if (playersByYahooId.has(yahooPlayer.yahoo_player_id)) {
        existingMappings.push({
          yahooPlayer,
          existingPlayer: playersByYahooId.get(yahooPlayer.yahoo_player_id)
        })
        return
      }
      
      // Check for exact name matches
      const normalizedYahooName = normalizePlayerName(yahooPlayer.yahoo_name_full)
      if (playersByName.has(normalizedYahooName)) {
        const matches = playersByName.get(normalizedYahooName)
        const unmappedMatches = matches.filter(p => !p.yahoo_player_id)
        
        if (unmappedMatches.length > 0) {
          exactNameMatches.push({
            yahooPlayer,
            existingPlayers: unmappedMatches,
            bestMatch: unmappedMatches[0] // Use first unmapped match
          })
          return
        }
      }
      
      // Check for similar name matches
      let bestMatch = null
      let bestScore = 0
      
      for (const [normalizedName, players] of playersByName.entries()) {
        const similarity = calculateSimilarity(yahooPlayer.yahoo_name_full, normalizedName)
        if (similarity > 0.7 && similarity > bestScore) {
          const unmappedPlayers = players.filter(p => !p.yahoo_player_id)
          if (unmappedPlayers.length > 0) {
            bestMatch = {
              players: unmappedPlayers,
              bestPlayer: unmappedPlayers[0],
              similarity
            }
            bestScore = similarity
          }
        }
      }
      
      if (bestMatch && bestScore > 0.7) {
        similarNameMatches.push({
          yahooPlayer,
          existingPlayers: bestMatch.players,
          bestMatch: bestMatch.bestPlayer,
          similarity: bestMatch.similarity
        })
      } else {
        missingPlayers.push(yahooPlayer)
      }
    })
    
    console.log('\\n📈 Analysis Results:')
    console.log(`- Yahoo players with existing mappings: ${existingMappings.length}`)
    console.log(`- Yahoo players with exact name matches: ${exactNameMatches.length}`)
    console.log(`- Yahoo players with similar name matches: ${similarNameMatches.length}`)
    console.log(`- Yahoo players missing from database: ${missingPlayers.length}`)
    
    // Show exact name matches
    if (exactNameMatches.length > 0) {
      console.log('\\n✅ Exact name matches (will be mapped):')
      exactNameMatches.slice(0, 10).forEach(match => {
        console.log(`- Yahoo: "${match.yahooPlayer.yahoo_name_full}" (${match.yahooPlayer.yahoo_player_id})`)
        console.log(`  -> UAFBL: "${match.bestMatch.name}" (ID: ${match.bestMatch.id})`)
      })
      if (exactNameMatches.length > 10) {
        console.log(`  ... and ${exactNameMatches.length - 10} more`)
      }
    }
    
    // Show similar name matches for review
    if (similarNameMatches.length > 0) {
      console.log('\\n🔍 Similar name matches (need review):')
      similarNameMatches.slice(0, 10).forEach(match => {
        console.log(`- Yahoo: "${match.yahooPlayer.yahoo_name_full}" (${match.yahooPlayer.yahoo_player_id})`)
        console.log(`  -> UAFBL: "${match.bestMatch.name}" (ID: ${match.bestMatch.id}) [${(match.similarity * 100).toFixed(1)}% similar]`)
      })
      if (similarNameMatches.length > 10) {
        console.log(`  ... and ${similarNameMatches.length - 10} more`)
      }
    }
    
    // Show missing players
    if (missingPlayers.length > 0) {
      console.log('\\n👤 Missing players (will be created):')
      missingPlayers.slice(0, 20).forEach(player => {
        const team = player.yahoo_team_abbr || ''
        const positions = player.yahoo_positions || ''
        console.log(`- ${player.yahoo_name_full} (Yahoo ID: ${player.yahoo_player_id}) ${team ? `[${team}]` : ''} ${positions ? `(${positions})` : ''}`)
      })
      if (missingPlayers.length > 20) {
        console.log(`  ... and ${missingPlayers.length - 20} more`)
      }
    }
    
    if (!isDryRun) {
      console.log('\\n🔨 Processing matches and creating players...')
      let mappedCount = 0
      let createdCount = 0
      let errorCount = 0
      
      // Map exact name matches
      console.log('\\n📝 Mapping exact name matches...')
      for (const match of exactNameMatches) {
        try {
          const { error } = await supabase
            .from('players')
            .update({
              yahoo_player_id: match.yahooPlayer.yahoo_player_id,
              yahoo_player_key: match.yahooPlayer.yahoo_player_key,
              yahoo_name_full: match.yahooPlayer.yahoo_name_full,
              yahoo_team_abbr: match.yahooPlayer.yahoo_team_abbr,
              yahoo_positions: match.yahooPlayer.yahoo_positions,
              yahoo_verified: true,
              yahoo_matched_at: new Date().toISOString(),
              data_source: match.bestMatch.data_source === 'uafbl' ? 'multi' : 
                          match.bestMatch.data_source === 'bbm' ? 'multi' : 'yahoo',
              notes: (match.bestMatch.notes || '') + ' Yahoo mapping added via name match'
            })
            .eq('id', match.bestMatch.id)
          
          if (error) {
            console.error(`❌ Failed to map ${match.yahooPlayer.yahoo_name_full}:`, error.message)
            errorCount++
          } else {
            console.log(`✅ Mapped ${match.yahooPlayer.yahoo_name_full} to ${match.bestMatch.name}`)
            mappedCount++
          }
        } catch (error) {
          console.error(`❌ Error mapping ${match.yahooPlayer.yahoo_name_full}:`, error.message)
          errorCount++
        }
      }
      
      // Get the maximum ID from existing players to generate sequential IDs
      let nextId = null
      if (missingPlayers.length > 0) {
        const { data: maxIdResult, error: maxIdError } = await supabase
          .from('players')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
        
        if (maxIdError) {
          console.error('❌ Failed to get max player ID:', maxIdError.message)
          process.exit(1)
        }
        
        nextId = maxIdResult && maxIdResult.length > 0 ? maxIdResult[0].id + 1 : 1
        console.log(`📝 Starting player creation from ID: ${nextId}`)
      }

      // Create missing players
      console.log('\\n👤 Creating missing players...')
      for (const yahooPlayer of missingPlayers) {
        try {
          const { data, error } = await supabase
            .from('players')
            .insert({
              id: nextId,
              name: yahooPlayer.yahoo_name_full,
              yahoo_player_id: yahooPlayer.yahoo_player_id,
              yahoo_player_key: yahooPlayer.yahoo_player_key,
              yahoo_name_full: yahooPlayer.yahoo_name_full,
              yahoo_team_abbr: yahooPlayer.yahoo_team_abbr,
              yahoo_positions: yahooPlayer.yahoo_positions,
              yahoo_verified: true,
              yahoo_matched_at: new Date().toISOString(),
              data_source: 'yahoo',
              notes: 'Created from Yahoo Fantasy API'
            })
            .select()
          
          nextId++ // Increment for next player
          
          if (error) {
            console.error(`❌ Failed to create ${yahooPlayer.yahoo_name_full}:`, error.message)
            errorCount++
          } else {
            console.log(`✅ Created ${yahooPlayer.yahoo_name_full} (ID: ${data[0].id})`)
            createdCount++
          }
        } catch (error) {
          console.error(`❌ Error creating ${yahooPlayer.yahoo_name_full}:`, error.message)
          errorCount++
        }
      }
      
      console.log('\\n📊 Processing Results:')
      console.log(`✅ Successfully mapped: ${mappedCount} players`)
      console.log(`✅ Successfully created: ${createdCount} players`)
      console.log(`❌ Errors: ${errorCount} players`)
      
      if (similarNameMatches.length > 0) {
        console.log(`\\n⚠️ ${similarNameMatches.length} similar name matches need manual review`)
        console.log('Review these matches and map them manually using the admin panel')
      }
      
    } else {
      console.log('\\n🔍 DRY RUN: Would process the following:')
      console.log(`- Map ${exactNameMatches.length} exact name matches`)
      console.log(`- Create ${missingPlayers.length} missing players`)
      console.log(`- ${similarNameMatches.length} similar matches need manual review`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}