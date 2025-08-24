#!/usr/bin/env node

/**
 * Yahoo Duplicate Cleanup Script
 * Fixes the issue where wrong Yahoo IDs were used and duplicates were created
 * 
 * The problem: Last import created duplicates instead of updating existing players
 * with correct Yahoo IDs from the API response
 * 
 * Usage: node cleanup-yahoo-duplicates.js [--dry-run]
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

// Enhanced name normalization for matching
function normalizePlayerName(name) {
  if (!name) return ''
  
  return name.toLowerCase()
    .replace(/[.''-]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/jr\.?$|sr\.?$|iii?$|iv$|junior$|senior$/, '') // Remove suffixes
    .replace(/\biii\b/, '') // Remove III anywhere
    .replace(/\b(de|von|van|el|la|le|del|della)\b/g, '') // Remove particles
    .trim()
}

function calculateSimilarity(name1, name2) {
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

async function getAllPlayers() {
  console.log('📖 Fetching all players from database...')
  
  let allPlayers = []
  let page = 0
  const pageSize = 1000
  let hasMore = true
  
  while (hasMore) {
    const { data: players, error } = await supabase
      .from('players')
      .select('id, name, yahoo_player_id, yahoo_name_full, bbm_id, data_source, created_at')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('id')
    
    if (error) {
      throw new Error(`Database error on page ${page + 1}: ${error.message}`)
    }
    
    allPlayers = [...allPlayers, ...players]
    hasMore = players.length === pageSize
    page++
  }
  
  console.log(`📊 Total players fetched: ${allPlayers.length}`)
  return allPlayers
}

async function main() {
  console.log('🧹 Yahoo Duplicate Cleanup Script')
  console.log('=================================')
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
  }
  
  try {
    // Load Yahoo processed data to get correct Yahoo IDs
    if (!fs.existsSync(YAHOO_DATA_FILE)) {
      console.error(`❌ Yahoo data file not found: ${YAHOO_DATA_FILE}`)
      process.exit(1)
    }
    
    console.log(`📖 Reading correct Yahoo data: ${YAHOO_DATA_FILE}`)
    const yahooData = JSON.parse(fs.readFileSync(YAHOO_DATA_FILE, 'utf8'))
    const correctYahooPlayers = yahooData.players
    
    console.log(`📊 Found ${correctYahooPlayers.length} correct Yahoo players`)
    
    // Get all current players
    const allPlayers = await getAllPlayers()
    
    // Separate players created today (likely the duplicates)
    const today = new Date().toISOString().split('T')[0]
    const todaysPlayers = allPlayers.filter(p => 
      p.created_at && p.created_at.startsWith('2025-08-24')
    )
    
    const existingPlayers = allPlayers.filter(p => 
      !p.created_at || !p.created_at.startsWith('2025-08-24')
    )
    
    console.log(`📊 Players created today (potential duplicates): ${todaysPlayers.length}`)
    console.log(`📊 Existing players: ${existingPlayers.length}`)
    
    // Create lookup maps for correct Yahoo data
    const yahooByPlayerId = new Map()
    const yahooByName = new Map()
    
    correctYahooPlayers.forEach(player => {
      yahooByPlayerId.set(player.yahoo_player_id, player)
      
      const normalizedName = normalizePlayerName(player.yahoo_name_full)
      if (!yahooByName.has(normalizedName)) {
        yahooByName.set(normalizedName, [])
      }
      yahooByName.get(normalizedName).push(player)
    })
    
    console.log('\n🔍 Analyzing duplicates and mismatched Yahoo IDs...')
    
    const correctMappings = []
    const duplicatesToDelete = []
    let updatedCount = 0
    let deletedCount = 0
    let errorCount = 0
    
    // Process today's players (likely duplicates)
    for (const todayPlayer of todaysPlayers) {
      // Find the correct Yahoo player by name match
      let correctYahooPlayer = null
      let bestExistingMatch = null
      let bestSimilarity = 0
      
      // First, try to find exact match in Yahoo data by name
      const normalizedName = normalizePlayerName(todayPlayer.name)
      if (yahooByName.has(normalizedName)) {
        correctYahooPlayer = yahooByName.get(normalizedName)[0]
      }
      
      // If not found, try similarity matching
      if (!correctYahooPlayer) {
        for (const yahooPlayer of correctYahooPlayers) {
          const similarity = calculateSimilarity(todayPlayer.name, yahooPlayer.yahoo_name_full)
          if (similarity >= 0.9) {
            correctYahooPlayer = yahooPlayer
            break
          }
        }
      }
      
      if (!correctYahooPlayer) {
        console.log(`⚠️ No Yahoo match found for: ${todayPlayer.name}`)
        continue
      }
      
      // Find existing player (non-today) that this should have been mapped to
      for (const existingPlayer of existingPlayers) {
        const similarity = calculateSimilarity(existingPlayer.name, todayPlayer.name)
        if (similarity >= 0.95) {
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity
            bestExistingMatch = existingPlayer
          }
        }
      }
      
      if (bestExistingMatch) {
        console.log(`📝 Found duplicate:`)
        console.log(`   Today's player: ${todayPlayer.name} (ID: ${todayPlayer.id}) Yahoo ID: ${todayPlayer.yahoo_player_id}`)
        console.log(`   Existing player: ${bestExistingMatch.name} (ID: ${bestExistingMatch.id}) Yahoo ID: ${bestExistingMatch.yahoo_player_id}`)
        console.log(`   Correct Yahoo ID should be: ${correctYahooPlayer.yahoo_player_id}`)
        
        // Plan to update existing player with correct Yahoo data and delete duplicate
        correctMappings.push({
          existingPlayer: bestExistingMatch,
          duplicatePlayer: todayPlayer,
          correctYahooData: correctYahooPlayer
        })
      } else {
        console.log(`⚠️ No existing match found for: ${todayPlayer.name} - this might be legitimate`)
      }
    }
    
    console.log(`\n📊 Analysis Results:`)
    console.log(`- Duplicates to fix: ${correctMappings.length}`)
    
    if (isDryRun) {
      console.log('\n🔍 DRY RUN - Would make the following changes:')
      correctMappings.forEach((mapping, index) => {
        console.log(`${index + 1}. Update player "${mapping.existingPlayer.name}" (ID: ${mapping.existingPlayer.id})`)
        console.log(`   - Set Yahoo ID: ${mapping.correctYahooData.yahoo_player_id}`)
        console.log(`   - Set Yahoo name: ${mapping.correctYahooData.yahoo_name_full}`)
        console.log(`   - Delete duplicate: "${mapping.duplicatePlayer.name}" (ID: ${mapping.duplicatePlayer.id})`)
      })
      return
    }
    
    // Execute fixes
    console.log('\n🔨 Executing fixes...')
    
    for (const mapping of correctMappings) {
      try {
        // Update existing player with correct Yahoo data
        const { error: updateError } = await supabase
          .from('players')
          .update({
            yahoo_player_id: mapping.correctYahooData.yahoo_player_id,
            yahoo_name_full: mapping.correctYahooData.yahoo_name_full,
            yahoo_name_first: mapping.correctYahooData.yahoo_first_name,
            yahoo_name_last: mapping.correctYahooData.yahoo_last_name,
            yahoo_team_abbr: mapping.correctYahooData.yahoo_team_abbr,
            yahoo_positions: mapping.correctYahooData.yahoo_positions,
            yahoo_player_key: mapping.correctYahooData.yahoo_player_key,
            yahoo_matched_at: new Date().toISOString(),
            data_source: mapping.existingPlayer.data_source === 'uafbl' ? 'multi' : 
                        mapping.existingPlayer.data_source === 'bbm' ? 'multi' : 'yahoo'
          })
          .eq('id', mapping.existingPlayer.id)
        
        if (updateError) {
          console.error(`❌ Failed to update ${mapping.existingPlayer.name}: ${updateError.message}`)
          errorCount++
          continue
        }
        
        // Delete the duplicate
        const { error: deleteError } = await supabase
          .from('players')
          .delete()
          .eq('id', mapping.duplicatePlayer.id)
        
        if (deleteError) {
          console.error(`❌ Failed to delete duplicate ${mapping.duplicatePlayer.name}: ${deleteError.message}`)
          errorCount++
        } else {
          console.log(`✅ Fixed: ${mapping.existingPlayer.name} (Yahoo ID: ${mapping.correctYahooData.yahoo_player_id})`)
          updatedCount++
          deletedCount++
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${mapping.existingPlayer.name}: ${error.message}`)
        errorCount++
      }
    }
    
    console.log('\n📊 Cleanup Results:')
    console.log(`✅ Successfully updated: ${updatedCount} players`)
    console.log(`✅ Successfully deleted: ${deletedCount} duplicates`)
    console.log(`❌ Errors: ${errorCount} players`)
    
    console.log('\n✨ Next steps:')
    console.log('1. Verify Yahoo IDs now match what Yahoo API provides')
    console.log('2. Run duplicate analysis again to confirm cleanup')
    console.log('3. Fix import logic to prevent future duplicate creation')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()