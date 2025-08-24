#!/usr/bin/env node

/**
 * Create Missing BBM Players Script
 * Compares BBM player list with current database and creates missing players
 * 
 * Usage: node create-missing-bbm-players.js [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjhrwwxvwqwmsjvelgrv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4'

const BBM_DATA_FILE = './bbm-players-processed.json'
const isDryRun = process.argv.includes('--dry-run')

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('🏀 Create Missing BBM Players Script')
  console.log('=====================================')
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
  }
  
  try {
    // Load BBM processed data
    if (!fs.existsSync(BBM_DATA_FILE)) {
      console.error(`❌ BBM data file not found: ${BBM_DATA_FILE}`)
      console.log('Please run: node import-bbm-ids.js first')
      process.exit(1)
    }
    
    console.log(`📖 Reading BBM data: ${BBM_DATA_FILE}`)
    const bbmData = JSON.parse(fs.readFileSync(BBM_DATA_FILE, 'utf8'))
    const bbmPlayers = bbmData.players
    
    console.log(`📊 Found ${bbmPlayers.length} BBM players`)
    
    // Get all current players from database (use pagination to handle large datasets)
    console.log('📖 Fetching current players from database...')
    let allPlayers = []
    let page = 0
    const pageSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data: players, error } = await supabase
        .from('players')
        .select('id, name, bbm_id, bbm_name')
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
    
    // Create lookup maps for comparison
    const playersByBbmId = new Map()
    const playersByName = new Map()
    
    allPlayers.forEach(player => {
      if (player.bbm_id) {
        playersByBbmId.set(player.bbm_id, player)
      }
      // Normalize name for comparison
      const normalizedName = player.name.toLowerCase().trim()
      if (!playersByName.has(normalizedName)) {
        playersByName.set(normalizedName, [])
      }
      playersByName.get(normalizedName).push(player)
    })
    
    // Find missing players
    const missingPlayers = []
    const existingMappings = []
    const nameMatches = []
    
    bbmPlayers.forEach(bbmPlayer => {
      const normalizedBbmName = bbmPlayer.bbm_name.toLowerCase().trim()
      
      // Check if BBM ID already exists
      if (playersByBbmId.has(bbmPlayer.bbm_id)) {
        existingMappings.push({
          bbmPlayer,
          existingPlayer: playersByBbmId.get(bbmPlayer.bbm_id)
        })
        return
      }
      
      // Check if name exists (potential match)
      if (playersByName.has(normalizedBbmName)) {
        nameMatches.push({
          bbmPlayer,
          existingPlayers: playersByName.get(normalizedBbmName)
        })
        return
      }
      
      // This player doesn't exist in our database
      missingPlayers.push(bbmPlayer)
    })
    
    console.log('\\n📈 Analysis Results:')
    console.log(`- BBM players with existing mappings: ${existingMappings.length}`)
    console.log(`- BBM players with potential name matches: ${nameMatches.length}`)
    console.log(`- BBM players missing from database: ${missingPlayers.length}`)
    
    // Show name matches for review
    if (nameMatches.length > 0) {
      console.log('\\n🔍 Potential name matches (need manual review):')
      nameMatches.slice(0, 10).forEach(match => {
        console.log(`- BBM: "${match.bbmPlayer.bbm_name}" (ID: ${match.bbmPlayer.bbm_id})`)
        match.existingPlayers.forEach(existing => {
          console.log(`  -> UAFBL: "${existing.name}" (ID: ${existing.id}, BBM ID: ${existing.bbm_id || 'none'})`)
        })
      })
      if (nameMatches.length > 10) {
        console.log(`  ... and ${nameMatches.length - 10} more`)
      }
    }
    
    // Show missing players
    if (missingPlayers.length > 0) {
      console.log('\\n👤 Missing players to be created:')
      missingPlayers.slice(0, 20).forEach(player => {
        const team = player.original_row.Team || ''
        const pos = player.original_row.Pos || ''
        console.log(`- ${player.bbm_name} (BBM ID: ${player.bbm_id}) ${team ? `[${team}]` : ''} ${pos ? `(${pos})` : ''}`)
      })
      if (missingPlayers.length > 20) {
        console.log(`  ... and ${missingPlayers.length - 20} more`)
      }
      
      if (!isDryRun) {
        console.log('\\n🔨 Creating missing players...')
        let createdCount = 0
        let errorCount = 0
        
        // Get the current max ID to know where to start
        const { data: maxIdResult } = await supabase
          .from('players')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
        
        let nextId = 1
        if (maxIdResult && maxIdResult.length > 0) {
          nextId = maxIdResult[0].id + 1
        }
        
        console.log(`Starting with ID ${nextId}`)
        
        // Process in batches of 10
        const batchSize = 10
        for (let i = 0; i < missingPlayers.length; i += batchSize) {
          const batch = missingPlayers.slice(i, i + batchSize)
          
          for (const bbmPlayer of batch) {
            try {
              const { data, error } = await supabase
                .from('players')
                .insert({
                  id: nextId,
                  name: bbmPlayer.bbm_name,
                  bbm_id: bbmPlayer.bbm_id,
                  bbm_name: bbmPlayer.bbm_name,
                  bbm_verified: true,
                  bbm_matched_at: new Date().toISOString(),
                  data_source: 'bbm',
                  notes: 'Created from BBM player list'
                })
                .select()
              
              if (error) {
                console.error(`❌ Failed to create ${bbmPlayer.bbm_name}:`, error.message)
                errorCount++
              } else {
                console.log(`✅ Created ${bbmPlayer.bbm_name} (ID: ${data[0].id})`)
                createdCount++
              }
              
              // Increment ID for next player regardless of success/failure
              nextId++
            } catch (error) {
              console.error(`❌ Error creating ${bbmPlayer.bbm_name}:`, error.message)
              errorCount++
              // Increment ID for next player regardless of success/failure
              nextId++
            }
          }
          
          // Small delay between batches
          if (i + batchSize < missingPlayers.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        console.log('\\n📊 Creation Results:')
        console.log(`✅ Successfully created: ${createdCount} players`)
        console.log(`❌ Failed to create: ${errorCount} players`)
        
        if (createdCount > 0) {
          console.log('\\n🎯 Next Steps:')
          console.log('1. Review the newly created players in the admin panel')
          console.log('2. Check for any duplicate players that need merging')
          console.log('3. Verify BBM mappings are correct')
        }
      } else {
        console.log('\\n🔍 DRY RUN: Would create these missing players')
        console.log(`Total players to create: ${missingPlayers.length}`)
      }
    } else {
      console.log('\\n✅ No missing players found - all BBM players exist in database')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}