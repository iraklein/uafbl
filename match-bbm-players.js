#!/usr/bin/env node

/**
 * BBM Player Matching Script
 * Matches existing UAFBL players with Basketball Monster player IDs
 * 
 * Usage: node match-bbm-players.js [--dry-run] [--auto-confirm]
 */

const fs = require('fs')
const readline = require('readline')
const { createClient } = require('@supabase/supabase-js')

// Configuration
const BBM_DATA_FILE = './bbm-players-processed.json'
const RESULTS_FILE = './bbm-matching-results.json'

// Supabase configuration - same as your app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Command line arguments
const isDryRun = process.argv.includes('--dry-run')
const autoConfirm = process.argv.includes('--auto-confirm')

/**
 * Normalize player name for matching
 */
function normalizeName(name) {
  if (!name) return ''
  
  return name
    .toLowerCase()
    .trim()
    // Remove common suffixes
    .replace(/\\s+(jr\\.?|sr\\.?|iii?|iv)$/i, '')
    // Normalize punctuation
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    // Remove extra whitespace
    .replace(/\\s+/g, ' ')
    // Remove common prefixes that might vary
    .replace(/^(de |d'|o')/i, '')
}

/**
 * Calculate similarity between two names using Levenshtein distance
 */
function calculateSimilarity(name1, name2) {
  const norm1 = normalizeName(name1)
  const norm2 = normalizeName(name2)
  
  if (norm1 === norm2) return 1.0
  
  const longer = norm1.length > norm2.length ? norm1 : norm2
  const shorter = norm1.length > norm2.length ? norm2 : norm1
  
  if (longer.length === 0) return 1.0
  
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1, str2) {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * Find potential matches for a BBM player
 */
function findMatches(bbmPlayer, uafblPlayers, threshold = 0.8) {
  const matches = uafblPlayers
    .map(uafblPlayer => ({
      uafblPlayer,
      similarity: calculateSimilarity(bbmPlayer.bbm_name, uafblPlayer.name),
      exactMatch: normalizeName(bbmPlayer.bbm_name) === normalizeName(uafblPlayer.name)
    }))
    .filter(match => match.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
  
  return matches
}

/**
 * Interactive confirmation for matches
 */
async function confirmMatch(bbmPlayer, match) {
  if (autoConfirm && match.similarity >= 0.95) {
    return true
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  console.log(`\\n🤔 Potential match found:`)
  console.log(`BBM: "${bbmPlayer.bbm_name}" (ID: ${bbmPlayer.bbm_id})`)
  console.log(`UAFBL: "${match.uafblPlayer.name}" (ID: ${match.uafblPlayer.id})`)
  console.log(`Similarity: ${(match.similarity * 100).toFixed(1)}%`)
  
  const answer = await new Promise(resolve => {
    rl.question('Accept this match? (y/n/s=skip): ', resolve)
  })
  
  rl.close()
  
  return answer.toLowerCase() === 'y'
}

async function main() {
  console.log('🏀 BBM Player Matching Script')
  console.log('==============================')
  
  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No database changes will be made')
  }
  
  try {
    // Load BBM data
    if (!fs.existsSync(BBM_DATA_FILE)) {
      console.error(`❌ BBM data file not found: ${BBM_DATA_FILE}`)
      console.log('Please run import-bbm-ids.js first')
      process.exit(1)
    }
    
    const bbmData = JSON.parse(fs.readFileSync(BBM_DATA_FILE, 'utf8'))
    const bbmPlayers = bbmData.players
    
    console.log(`📖 Loaded ${bbmPlayers.length} BBM players`)
    
    // Load UAFBL players
    console.log('📖 Loading UAFBL players from database...')
    const { data: uafblPlayers, error } = await supabase
      .from('players')
      .select('id, name, bbm_id')
      .order('name')
    
    if (error) {
      console.error('❌ Error loading UAFBL players:', error)
      process.exit(1)
    }
    
    console.log(`📖 Loaded ${uafblPlayers.length} UAFBL players`)
    
    // Filter out players that already have BBM IDs
    const unmatched = uafblPlayers.filter(p => !p.bbm_id)
    console.log(`🎯 ${unmatched.length} UAFBL players need BBM matching`)
    
    // Start matching process
    const results = {
      processedAt: new Date().toISOString(),
      isDryRun,
      stats: {
        bbmPlayersTotal: bbmPlayers.length,
        uafblPlayersTotal: uafblPlayers.length,
        uafblPlayersUnmatched: unmatched.length,
        exactMatches: 0,
        approxMatches: 0,
        manualMatches: 0,
        skippedMatches: 0,
        noMatches: 0,
        errors: 0
      },
      matches: [],
      unmatched: [],
      errors: []
    }
    
    console.log('\\n🔍 Starting matching process...')
    
    for (const bbmPlayer of bbmPlayers) {
      try {
        const matches = findMatches(bbmPlayer, unmatched)
        
        if (matches.length === 0) {
          results.stats.noMatches++
          results.unmatched.push({
            bbm_id: bbmPlayer.bbm_id,
            bbm_name: bbmPlayer.bbm_name,
            reason: 'no_potential_matches'
          })
          continue
        }
        
        const bestMatch = matches[0]
        
        let shouldMatch = false
        let matchType = 'none'
        
        if (bestMatch.exactMatch || bestMatch.similarity >= 0.98) {
          shouldMatch = true
          matchType = 'exact'
          results.stats.exactMatches++
        } else if (bestMatch.similarity >= 0.90) {
          shouldMatch = autoConfirm || await confirmMatch(bbmPlayer, bestMatch)
          matchType = shouldMatch ? 'approximate' : 'skipped'
          if (shouldMatch) {
            results.stats.approxMatches++
          } else {
            results.stats.skippedMatches++
          }
        } else if (bestMatch.similarity >= 0.80) {
          shouldMatch = await confirmMatch(bbmPlayer, bestMatch)
          matchType = shouldMatch ? 'manual' : 'skipped'
          if (shouldMatch) {
            results.stats.manualMatches++
          } else {
            results.stats.skippedMatches++
          }
        } else {
          results.stats.noMatches++
          results.unmatched.push({
            bbm_id: bbmPlayer.bbm_id,
            bbm_name: bbmPlayer.bbm_name,
            reason: 'low_similarity',
            best_similarity: bestMatch.similarity
          })
          continue
        }
        
        if (shouldMatch) {
          const matchRecord = {
            bbm_id: bbmPlayer.bbm_id,
            bbm_name: bbmPlayer.bbm_name,
            uafbl_id: bestMatch.uafblPlayer.id,
            uafbl_name: bestMatch.uafblPlayer.name,
            similarity: bestMatch.similarity,
            match_type: matchType,
            matched_at: new Date().toISOString()
          }
          
          results.matches.push(matchRecord)
          
          // Update database if not dry run
          if (!isDryRun) {
            const { error: updateError } = await supabase
              .from('players')
              .update({
                bbm_id: bbmPlayer.bbm_id,
                bbm_name: bbmPlayer.bbm_name,
                bbm_verified: matchType === 'exact',
                data_source: 'bbm',
                bbm_matched_at: new Date().toISOString(),
                notes: `Auto-matched via ${matchType} match (similarity: ${(bestMatch.similarity * 100).toFixed(1)}%)`
              })
              .eq('id', bestMatch.uafblPlayer.id)
            
            if (updateError) {
              console.error(`❌ Error updating player ${bestMatch.uafblPlayer.id}:`, updateError)
              results.stats.errors++
              results.errors.push({
                bbm_id: bbmPlayer.bbm_id,
                uafbl_id: bestMatch.uafblPlayer.id,
                error: updateError.message
              })
            } else {
              console.log(`✅ ${matchType.toUpperCase()}: ${bbmPlayer.bbm_name} → ${bestMatch.uafblPlayer.name} (${(bestMatch.similarity * 100).toFixed(1)}%)`)
            }
          } else {
            console.log(`🧪 DRY RUN - Would match: ${bbmPlayer.bbm_name} → ${bestMatch.uafblPlayer.name} (${(bestMatch.similarity * 100).toFixed(1)}%)`)
          }
          
          // Remove matched player from unmatched list
          const index = unmatched.findIndex(p => p.id === bestMatch.uafblPlayer.id)
          if (index !== -1) {
            unmatched.splice(index, 1)
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing BBM player ${bbmPlayer.bbm_id}:`, error)
        results.stats.errors++
        results.errors.push({
          bbm_id: bbmPlayer.bbm_id,
          bbm_name: bbmPlayer.bbm_name,
          error: error.message
        })
      }
    }
    
    // Save results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2))
    
    // Print summary
    console.log('\\n📊 Matching Results:')
    console.log(`- Exact matches: ${results.stats.exactMatches}`)
    console.log(`- Approximate matches: ${results.stats.approxMatches}`)
    console.log(`- Manual matches: ${results.stats.manualMatches}`)
    console.log(`- Skipped matches: ${results.stats.skippedMatches}`)
    console.log(`- No matches found: ${results.stats.noMatches}`)
    console.log(`- Errors: ${results.stats.errors}`)
    console.log(`\\n💾 Results saved to: ${RESULTS_FILE}`)
    
    if (isDryRun) {
      console.log('\\n🧪 This was a dry run. Run without --dry-run to apply changes.')
    } else {
      console.log('\\n✅ Database updated with BBM mappings!')
    }
    
  } catch (error) {
    console.error('❌ Error in matching process:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}