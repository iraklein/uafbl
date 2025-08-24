#!/usr/bin/env node

/**
 * Improved Yahoo Player Matching Script
 * Enhanced duplicate detection to prevent creating duplicate players
 * 
 * Usage: node match-yahoo-players-improved.js [--dry-run]
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

// Enhanced name normalization
function normalizePlayerName(name) {
  return name.toLowerCase()
    .replace(/[.''-]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/jr\.?$|sr\.?$|iii?$|iv$|junior$|senior$/, '') // Remove suffixes
    .replace(/\biii\b/, '') // Remove III anywhere
    .replace(/\b(de|von|van|el|la|le|del|della)\b/g, '') // Remove particles
    .trim()
}

// Multiple normalization strategies for better matching
function getNameVariants(name) {
  const variants = new Set()
  const normalized = normalizePlayerName(name)
  
  // Main normalized name
  variants.add(normalized)
  
  // Without middle names/initials
  const words = normalized.split(' ')
  if (words.length > 2) {
    variants.add(`${words[0]} ${words[words.length - 1]}`)
  }
  
  // Handle common name variations
  const nameMap = {
    'jimmy': 'james',
    'james': 'jimmy',
    'mike': 'michael',
    'michael': 'mike',
    'bob': 'robert',
    'robert': 'bob',
    'bill': 'william',
    'william': 'bill',
    'rich': 'richard',
    'richard': 'rich',
    'dave': 'david',
    'david': 'dave',
    'chris': 'christopher',
    'christopher': 'chris',
    'tony': 'anthony',
    'anthony': 'tony'
  }
  
  // Create variants with common name substitutions
  words.forEach((word, index) => {
    if (nameMap[word]) {
      const variantWords = [...words]
      variantWords[index] = nameMap[word]
      variants.add(variantWords.join(' '))
    }
  })
  
  return Array.from(variants)
}

function calculateSimilarity(name1, name2) {
  const variants1 = getNameVariants(name1)
  const variants2 = getNameVariants(name2)
  
  // Check for exact matches in variants
  for (const v1 of variants1) {
    for (const v2 of variants2) {
      if (v1 === v2) return 1.0
    }
  }
  
  // Check for containment
  const n1 = normalizePlayerName(name1)
  const n2 = normalizePlayerName(name2)
  if (n1.includes(n2) || n2.includes(n1)) return 0.95
  
  // Word overlap calculation
  const words1 = n1.split(' ')
  const words2 = n2.split(' ')
  const overlap = words1.filter(word => words2.includes(word)).length
  const union = new Set([...words1, ...words2]).size
  
  return overlap / Math.max(words1.length, words2.length)
}

async function main() {
  console.log('🏀 Yahoo Player Matching Script (Improved)')
  console.log('==========================================')
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
  }
  
  try {
    // Load Yahoo processed data
    if (!fs.existsSync(YAHOO_DATA_FILE)) {
      console.error(`❌ Yahoo data file not found: ${YAHOO_DATA_FILE}`)
      console.log('Please run a Yahoo import script first')
      process.exit(1)
    }
    
    console.log(`📖 Reading Yahoo data: ${YAHOO_DATA_FILE}`)
    const yahooData = JSON.parse(fs.readFileSync(YAHOO_DATA_FILE, 'utf8'))
    const yahooPlayers = yahooData.players
    
    console.log(`📊 Found ${yahooPlayers.length} Yahoo players`)
    
    // Get all current players from database with high limit
    console.log('📖 Fetching current players from database...')
    const { data: allPlayers, error } = await supabase
      .from('players')
      .select('id, name, yahoo_player_id, yahoo_name_full, data_source')
      .limit(2000) // Ensure we get all players
      .order('name')
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
    
    console.log(`📊 Found ${allPlayers.length} existing players in database`)
    
    // Create enhanced lookup maps
    const playersByYahooId = new Map()
    const playersByNameVariant = new Map()
    
    allPlayers.forEach(player => {
      // Map by Yahoo ID
      if (player.yahoo_player_id) {
        playersByYahooId.set(player.yahoo_player_id, player)
      }
      
      // Map by all name variants
      const variants = getNameVariants(player.name)
      variants.forEach(variant => {
        if (!playersByNameVariant.has(variant)) {
          playersByNameVariant.set(variant, [])
        }
        playersByNameVariant.get(variant).push(player)
      })
    })
    
    // Process Yahoo players with enhanced matching
    const existingMappings = []
    const exactNameMatches = []
    const similarNameMatches = []
    const missingPlayers = []
    const potentialDuplicates = []
    
    yahooPlayers.forEach(yahooPlayer => {
      // Check if Yahoo ID already exists
      if (playersByYahooId.has(yahooPlayer.yahoo_player_id)) {
        existingMappings.push({
          yahooPlayer,
          existingPlayer: playersByYahooId.get(yahooPlayer.yahoo_player_id)
        })
        return
      }
      
      // Check for exact name matches using variants
      const yahooVariants = getNameVariants(yahooPlayer.yahoo_name_full)
      let exactMatch = null
      let exactMatchFound = false
      
      for (const variant of yahooVariants) {
        if (playersByNameVariant.has(variant)) {
          const matches = playersByNameVariant.get(variant)
          const unmappedMatches = matches.filter(p => !p.yahoo_player_id)
          
          if (unmappedMatches.length > 0) {
            exactMatch = unmappedMatches[0]
            exactMatchFound = true
            break
          }
        }
      }
      
      if (exactMatchFound) {
        exactNameMatches.push({
          yahooPlayer,
          existingPlayer: exactMatch
        })
        return
      }
      
      // Check for high similarity matches (potential duplicates)
      let bestMatch = null
      let bestScore = 0
      
      allPlayers.forEach(existingPlayer => {
        if (existingPlayer.yahoo_player_id) return // Skip already mapped players
        
        const similarity = calculateSimilarity(yahooPlayer.yahoo_name_full, existingPlayer.name)
        if (similarity > bestScore) {
          bestScore = similarity
          bestMatch = existingPlayer
        }
      })
      
      if (bestScore >= 0.85) { // High similarity threshold
        potentialDuplicates.push({
          yahooPlayer,
          existingPlayer: bestMatch,
          similarity: bestScore
        })
        return
      } else if (bestScore >= 0.7) { // Medium similarity
        similarNameMatches.push({
          yahooPlayer,
          existingPlayer: bestMatch,
          similarity: bestScore
        })
        return
      }
      
      // No match found - truly missing player
      missingPlayers.push(yahooPlayer)
    })
    
    // Display analysis results
    console.log('\n📈 Enhanced Analysis Results:')
    console.log(`- Yahoo players with existing mappings: ${existingMappings.length}`)
    console.log(`- Yahoo players with exact name matches: ${exactNameMatches.length}`)
    console.log(`- Yahoo players with similar name matches: ${similarNameMatches.length}`)
    console.log(`- Potential duplicate players (high similarity): ${potentialDuplicates.length}`)
    console.log(`- Yahoo players missing from database: ${missingPlayers.length}`)
    
    // Show exact matches
    if (exactNameMatches.length > 0) {
      console.log('\n✅ Exact name matches (will be mapped):')
      exactNameMatches.forEach(match => {
        console.log(`- Yahoo: "${match.yahooPlayer.yahoo_name_full}" (${match.yahooPlayer.yahoo_player_id})`)
        console.log(`  -> UAFBL: "${match.existingPlayer.name}" (ID: ${match.existingPlayer.id})`)
      })
    }
    
    // Show potential duplicates for review
    if (potentialDuplicates.length > 0) {
      console.log('\n⚠️ Potential duplicates (require manual review):')
      potentialDuplicates.forEach(match => {
        console.log(`- Yahoo: "${match.yahooPlayer.yahoo_name_full}" (${match.yahooPlayer.yahoo_player_id})`)
        console.log(`  -> Similar to: "${match.existingPlayer.name}" (ID: ${match.existingPlayer.id}) [${(match.similarity * 100).toFixed(1)}% similar]`)
      })
    }
    
    // Show missing players
    if (missingPlayers.length > 0) {
      console.log('\n👤 Missing players (will be created):')
      missingPlayers.slice(0, 20).forEach(player => {
        console.log(`- ${player.yahoo_name_full} (Yahoo ID: ${player.yahoo_player_id}) [${player.yahoo_team_abbr || 'FA'}] (${player.yahoo_positions || 'No Pos'})`)
      })
      if (missingPlayers.length > 20) {
        console.log(`  ... and ${missingPlayers.length - 20} more`)
      }
    }
    
    if (isDryRun) {
      console.log('\n🔍 DRY RUN: Would process the following:')
      console.log(`- Map ${exactNameMatches.length} exact name matches`)
      console.log(`- Create ${missingPlayers.length} missing players`)
      console.log(`- ${potentialDuplicates.length} potential duplicates need manual review`)
      console.log(`- ${similarNameMatches.length} similar matches need manual review`)
      return
    }
    
    // Process matches and create players
    console.log('\n🔨 Processing matches and creating players...')
    let mappedCount = 0
    let createdCount = 0
    let errorCount = 0
    
    // Map exact matches
    console.log('\n📝 Mapping exact name matches...')
    for (const match of exactNameMatches) {
      try {
        const { error } = await supabase
          .from('players')
          .update({
            yahoo_player_id: match.yahooPlayer.yahoo_player_id,
            yahoo_name_full: match.yahooPlayer.yahoo_name_full,
            yahoo_name_first: match.yahooPlayer.yahoo_first_name,
            yahoo_name_last: match.yahooPlayer.yahoo_last_name,
            yahoo_team_abbr: match.yahooPlayer.yahoo_team_abbr,
            yahoo_positions: match.yahooPlayer.yahoo_positions,
            yahoo_player_key: match.yahooPlayer.yahoo_player_key,
            yahoo_matched_at: new Date().toISOString()
          })
          .eq('id', match.existingPlayer.id)
        
        if (error) {
          console.error(`❌ Failed to map ${match.yahooPlayer.yahoo_name_full}: ${error.message}`)
          errorCount++
        } else {
          console.log(`✅ Mapped ${match.yahooPlayer.yahoo_name_full} to ${match.existingPlayer.name}`)
          mappedCount++
        }
      } catch (error) {
        console.error(`❌ Error mapping ${match.yahooPlayer.yahoo_name_full}: ${error.message}`)
        errorCount++
      }
    }
    
    // Get next available player ID
    const { data: maxPlayer } = await supabase
      .from('players')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    
    let nextId = (maxPlayer?.id || 7000) + 1
    console.log(`\n📝 Starting player creation from ID: ${nextId}`)
    
    // Create missing players
    console.log('\n👤 Creating missing players...')
    for (const yahooPlayer of missingPlayers) {
      try {
        const newPlayer = {
          id: nextId,
          name: yahooPlayer.yahoo_name_full,
          yahoo_player_id: yahooPlayer.yahoo_player_id,
          yahoo_name_full: yahooPlayer.yahoo_name_full,
          yahoo_name_first: yahooPlayer.yahoo_first_name,
          yahoo_name_last: yahooPlayer.yahoo_last_name,
          yahoo_team_abbr: yahooPlayer.yahoo_team_abbr,
          yahoo_positions: yahooPlayer.yahoo_positions,
          yahoo_player_key: yahooPlayer.yahoo_player_key,
          data_source: 'yahoo_api',
          yahoo_matched_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
        
        const { error } = await supabase
          .from('players')
          .insert(newPlayer)
        
        if (error) {
          console.error(`❌ Failed to create ${yahooPlayer.yahoo_name_full}: ${error.message}`)
          errorCount++
        } else {
          console.log(`✅ Created ${yahooPlayer.yahoo_name_full} (ID: ${nextId})`)
          createdCount++
        }
        
        nextId++
      } catch (error) {
        console.error(`❌ Error creating ${yahooPlayer.yahoo_name_full}: ${error.message}`)
        errorCount++
      }
    }
    
    console.log('\n📊 Processing Results:')
    console.log(`✅ Successfully mapped: ${mappedCount} players`)
    console.log(`✅ Successfully created: ${createdCount} players`)
    console.log(`❌ Errors: ${errorCount} players`)
    
    if (potentialDuplicates.length > 0) {
      console.log(`\n⚠️ Manual Review Required:`)
      console.log(`- ${potentialDuplicates.length} potential duplicates detected`)
      console.log(`- Review these matches and merge duplicates if needed`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()