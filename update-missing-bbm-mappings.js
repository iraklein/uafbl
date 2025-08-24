#!/usr/bin/env node

/**
 * Update Missing BBM Mappings Script
 * Updates existing players that match BBM names but don't have BBM IDs
 * 
 * Usage: node update-missing-bbm-mappings.js [--dry-run]
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
  console.log('🔗 Update Missing BBM Mappings Script')
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
    
    // Get all current players from database
    console.log('📖 Fetching current players from database...')
    let allPlayers = []
    let page = 0
    const pageSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data: players, error } = await supabase
        .from('players')
        .select('id, name, bbm_id, bbm_name, data_source')
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
    const playersByBbmId = new Map()
    const playersByName = new Map()
    
    allPlayers.forEach(player => {
      if (player.bbm_id) {
        playersByBbmId.set(player.bbm_id, player)
      }
      const normalizedName = player.name.toLowerCase().trim()
      if (!playersByName.has(normalizedName)) {
        playersByName.set(normalizedName, [])
      }
      playersByName.get(normalizedName).push(player)
    })
    
    // Find players that match by name but don't have BBM IDs
    const nameMatches = []
    
    bbmPlayers.forEach(bbmPlayer => {
      const normalizedBbmName = bbmPlayer.bbm_name.toLowerCase().trim()
      
      // Skip if BBM ID already mapped
      if (playersByBbmId.has(bbmPlayer.bbm_id)) {
        return
      }
      
      // Check for exact name matches
      if (playersByName.has(normalizedBbmName)) {
        const existingPlayers = playersByName.get(normalizedBbmName)
        
        // Only consider players without BBM IDs
        const unmappedPlayers = existingPlayers.filter(p => !p.bbm_id)
        
        if (unmappedPlayers.length > 0) {
          // Prefer players with no BBM mapping or data source 'uafbl'
          const bestMatch = unmappedPlayers.find(p => !p.data_source || p.data_source === 'uafbl') || unmappedPlayers[0]
          
          nameMatches.push({
            bbmPlayer,
            existingPlayer: bestMatch,
            allMatches: unmappedPlayers
          })
        }
      }
    })
    
    console.log(`\\n🔍 Found ${nameMatches.length} exact name matches to update`)
    
    if (nameMatches.length > 0) {
      console.log('\\n👥 Players to update with BBM mappings:')
      nameMatches.forEach(match => {
        console.log(`- "${match.existingPlayer.name}" (UAFBL ID: ${match.existingPlayer.id}) -> BBM ID: ${match.bbmPlayer.bbm_id}`)
        if (match.allMatches.length > 1) {
          console.log(`  ⚠️ Multiple matches found, using first one`)
        }
      })
      
      if (!isDryRun) {
        console.log('\\n🔨 Updating BBM mappings...')
        let updatedCount = 0
        let errorCount = 0
        
        for (const match of nameMatches) {
          try {
            const { data, error } = await supabase
              .from('players')
              .update({
                bbm_id: match.bbmPlayer.bbm_id,
                bbm_name: match.bbmPlayer.bbm_name,
                bbm_verified: true,
                bbm_matched_at: new Date().toISOString(),
                data_source: match.existingPlayer.data_source === 'uafbl' ? 'multi' : 'bbm',
                notes: (match.existingPlayer.notes || '') + ' BBM mapping added from name match'
              })
              .eq('id', match.existingPlayer.id)
              .select()
            
            if (error) {
              console.error(`❌ Failed to update ${match.existingPlayer.name}:`, error.message)
              errorCount++
            } else {
              console.log(`✅ Updated ${match.existingPlayer.name} with BBM ID ${match.bbmPlayer.bbm_id}`)
              updatedCount++
            }
          } catch (error) {
            console.error(`❌ Error updating ${match.existingPlayer.name}:`, error.message)
            errorCount++
          }
        }
        
        console.log('\\n📊 Update Results:')
        console.log(`✅ Successfully updated: ${updatedCount} players`)
        console.log(`❌ Failed to update: ${errorCount} players`)
        
      } else {
        console.log('\\n🔍 DRY RUN: Would update these players with BBM mappings')
      }
    } else {
      console.log('\\n✅ No players found that need BBM mapping updates')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}