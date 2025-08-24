#!/usr/bin/env node

/**
 * Comprehensive Duplicate Player Analysis
 * Handles Supabase 1000-row limit with proper pagination
 * 
 * Usage: node analyze-all-duplicates.js
 */

const { createClient } = require('@supabase/supabase-js')

// Configuration - using correct environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjhrwwxvwqwmsjvelgrv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4'

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

// Enhanced name normalization for duplicate detection
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
  
  return overlap / Math.max(words1.length, words2.length)
}

async function getAllPlayers() {
  console.log('📖 Fetching ALL players from database (handling 1000-row limit)...')
  
  let allPlayers = []
  let page = 0
  const pageSize = 1000
  let hasMore = true
  
  while (hasMore) {
    console.log(`📄 Fetching page ${page + 1} (${page * pageSize + 1}-${(page + 1) * pageSize})...`)
    
    const { data: players, error } = await supabase
      .from('players')
      .select('id, name, yahoo_player_id, yahoo_name_full, bbm_id, data_source, created_at')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('id')
    
    if (error) {
      throw new Error(`Database error on page ${page + 1}: ${error.message}`)
    }
    
    console.log(`✅ Got ${players.length} players on page ${page + 1}`)
    allPlayers = [...allPlayers, ...players]
    hasMore = players.length === pageSize
    page++
  }
  
  console.log(`📊 Total players fetched: ${allPlayers.length}`)
  return allPlayers
}

function groupDuplicates(players) {
  console.log('\n🔍 Analyzing for potential duplicates...')
  
  const duplicateGroups = []
  const processed = new Set()
  
  for (let i = 0; i < players.length; i++) {
    if (processed.has(i)) continue
    
    const player1 = players[i]
    const potentialDuplicates = [player1]
    processed.add(i)
    
    for (let j = i + 1; j < players.length; j++) {
      if (processed.has(j)) continue
      
      const player2 = players[j]
      const similarity = calculateSimilarity(player1.name, player2.name)
      
      if (similarity >= 0.85) {
        potentialDuplicates.push(player2)
        processed.add(j)
      }
    }
    
    if (potentialDuplicates.length > 1) {
      duplicateGroups.push({
        players: potentialDuplicates,
        similarity: Math.max(...potentialDuplicates.slice(1).map(p => calculateSimilarity(player1.name, p.name)))
      })
    }
  }
  
  return duplicateGroups
}

async function main() {
  console.log('🔍 Comprehensive Duplicate Player Analysis')
  console.log('=========================================')
  
  try {
    // Get ALL players from database
    const allPlayers = await getAllPlayers()
    
    if (allPlayers.length === 0) {
      console.error('❌ No players found in database')
      return
    }
    
    // Group potential duplicates
    const duplicateGroups = groupDuplicates(allPlayers)
    
    console.log('\n📈 Analysis Results:')
    console.log(`- Total players analyzed: ${allPlayers.length}`)
    console.log(`- Potential duplicate groups found: ${duplicateGroups.length}`)
    console.log(`- Total potentially duplicate players: ${duplicateGroups.reduce((sum, group) => sum + group.players.length, 0)}`)
    
    if (duplicateGroups.length === 0) {
      console.log('\n✅ No potential duplicates found!')
      return
    }
    
    // Sort by similarity score (highest first)
    duplicateGroups.sort((a, b) => b.similarity - a.similarity)
    
    console.log('\n🔍 Potential Duplicate Groups (sorted by similarity):')
    console.log('='.repeat(60))
    
    duplicateGroups.forEach((group, index) => {
      console.log(`\n${index + 1}. Similarity: ${(group.similarity * 100).toFixed(1)}%`)
      console.log('-'.repeat(40))
      
      group.players.forEach(player => {
        const yahooId = player.yahoo_player_id ? `Yahoo: ${player.yahoo_player_id}` : 'No Yahoo ID'
        const bbmId = player.bbm_id ? `BBM: ${player.bbm_id}` : 'No BBM ID'
        const createdAt = player.created_at ? new Date(player.created_at).toLocaleDateString() : 'Unknown'
        
        console.log(`   • ID ${player.id}: "${player.name}"`)
        console.log(`     ${yahooId} | ${bbmId} | Source: ${player.data_source || 'unknown'} | Created: ${createdAt}`)
      })
    })
    
    // Summary statistics
    console.log('\n📊 Summary by Similarity Range:')
    console.log('-'.repeat(40))
    
    const ranges = [
      { min: 0.95, max: 1.0, label: 'Exact matches (95-100%)' },
      { min: 0.90, max: 0.95, label: 'Very high similarity (90-95%)' },
      { min: 0.85, max: 0.90, label: 'High similarity (85-90%)' }
    ]
    
    ranges.forEach(range => {
      const groupsInRange = duplicateGroups.filter(group => 
        group.similarity >= range.min && group.similarity < range.max
      )
      const playersInRange = groupsInRange.reduce((sum, group) => sum + group.players.length, 0)
      
      console.log(`${range.label}: ${groupsInRange.length} groups (${playersInRange} players)`)
    })
    
    // Data source analysis
    console.log('\n📋 Duplicate Analysis by Data Source:')
    console.log('-'.repeat(40))
    
    const sourceStats = {}
    duplicateGroups.forEach(group => {
      group.players.forEach(player => {
        const source = player.data_source || 'unknown'
        sourceStats[source] = (sourceStats[source] || 0) + 1
      })
    })
    
    Object.entries(sourceStats).forEach(([source, count]) => {
      console.log(`${source}: ${count} potentially duplicate players`)
    })
    
    console.log('\n💡 Recommended Actions:')
    console.log('- Review exact matches (95-100%) first - likely safe to merge')
    console.log('- Manually review high similarity matches (85-95%)')
    console.log('- Focus on players with different data sources for verification')
    console.log('- Check Yahoo/BBM IDs to identify which record to keep as primary')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()