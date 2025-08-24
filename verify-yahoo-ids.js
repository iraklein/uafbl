#!/usr/bin/env node

/**
 * Yahoo ID Verification Script
 * Verifies that all Yahoo player IDs in database match what Yahoo API provides
 * 
 * Usage: node verify-yahoo-ids.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjhrwwxvwqwmsjvelgrv.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4'

const YAHOO_DATA_FILE = './yahoo-players-processed.json'

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

async function getAllPlayersWithYahoo() {
  console.log('📖 Fetching players with Yahoo IDs from database...')
  
  let allPlayers = []
  let page = 0
  const pageSize = 1000
  let hasMore = true
  
  while (hasMore) {
    const { data: players, error } = await supabase
      .from('players')
      .select('id, name, yahoo_player_id, yahoo_name_full, data_source')
      .not('yahoo_player_id', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('id')
    
    if (error) {
      throw new Error(`Database error on page ${page + 1}: ${error.message}`)
    }
    
    allPlayers = [...allPlayers, ...players]
    hasMore = players.length === pageSize
    page++
  }
  
  console.log(`📊 Total players with Yahoo IDs: ${allPlayers.length}`)
  return allPlayers
}

async function main() {
  console.log('✅ Yahoo ID Verification Script')
  console.log('===============================')
  
  try {
    // Load Yahoo processed data to get correct Yahoo IDs
    if (!fs.existsSync(YAHOO_DATA_FILE)) {
      console.error(`❌ Yahoo data file not found: ${YAHOO_DATA_FILE}`)
      process.exit(1)
    }
    
    console.log(`📖 Reading correct Yahoo data: ${YAHOO_DATA_FILE}`)
    const yahooData = JSON.parse(fs.readFileSync(YAHOO_DATA_FILE, 'utf8'))
    const correctYahooPlayers = yahooData.players
    
    console.log(`📊 Found ${correctYahooPlayers.length} correct Yahoo players from API`)
    
    // Create lookup map for correct Yahoo data
    const yahooByPlayerId = new Map()
    const yahooByName = new Map()
    
    correctYahooPlayers.forEach(player => {
      yahooByPlayerId.set(player.yahoo_player_id, player)
      
      const normalizedName = player.yahoo_name_full.toLowerCase().replace(/[^a-z\s]/g, '').trim()
      if (!yahooByName.has(normalizedName)) {
        yahooByName.set(normalizedName, [])
      }
      yahooByName.get(normalizedName).push(player)
    })
    
    // Get all players with Yahoo IDs
    const dbPlayers = await getAllPlayersWithYahoo()
    
    console.log('\n🔍 Verifying Yahoo ID consistency...')
    
    const correctIds = []
    const incorrectIds = []
    const missingFromYahoo = []
    
    for (const dbPlayer of dbPlayers) {
      // Check if the Yahoo ID exists in our correct data
      const correctYahooPlayer = yahooByPlayerId.get(dbPlayer.yahoo_player_id)
      
      if (correctYahooPlayer) {
        correctIds.push({
          dbPlayer,
          yahooPlayer: correctYahooPlayer
        })
      } else {
        // Check if we can find by name
        const normalizedDbName = dbPlayer.name.toLowerCase().replace(/[^a-z\s]/g, '').trim()
        const possibleMatches = yahooByName.get(normalizedDbName) || []
        
        if (possibleMatches.length > 0) {
          incorrectIds.push({
            dbPlayer,
            correctYahooPlayer: possibleMatches[0],
            issue: 'Wrong Yahoo ID'
          })
        } else {
          missingFromYahoo.push({
            dbPlayer,
            issue: 'Not found in Yahoo API data'
          })
        }
      }
    }
    
    console.log('\n📊 Verification Results:')
    console.log(`✅ Correct Yahoo IDs: ${correctIds.length}`)
    console.log(`❌ Incorrect Yahoo IDs: ${incorrectIds.length}`)
    console.log(`⚠️ Missing from Yahoo API: ${missingFromYahoo.length}`)
    
    if (incorrectIds.length > 0) {
      console.log('\n❌ Players with INCORRECT Yahoo IDs:')
      incorrectIds.forEach((item, index) => {
        console.log(`${index + 1}. "${item.dbPlayer.name}" (ID: ${item.dbPlayer.id})`)
        console.log(`   Current Yahoo ID: ${item.dbPlayer.yahoo_player_id}`)
        console.log(`   Correct Yahoo ID: ${item.correctYahooPlayer.yahoo_player_id}`)
        console.log(`   Data source: ${item.dbPlayer.data_source}`)
      })
    }
    
    if (missingFromYahoo.length > 0) {
      console.log('\n⚠️ Players with Yahoo IDs NOT found in Yahoo API data:')
      missingFromYahoo.slice(0, 20).forEach((item, index) => {
        console.log(`${index + 1}. "${item.dbPlayer.name}" (ID: ${item.dbPlayer.id}) Yahoo ID: ${item.dbPlayer.yahoo_player_id}`)
      })
      if (missingFromYahoo.length > 20) {
        console.log(`   ... and ${missingFromYahoo.length - 20} more`)
      }
    }
    
    // Summary by data source
    console.log('\n📋 Analysis by Data Source:')
    const sourceCounts = {}
    
    dbPlayers.forEach(player => {
      const source = player.data_source || 'unknown'
      if (!sourceCounts[source]) {
        sourceCounts[source] = { total: 0, correct: 0, incorrect: 0, missing: 0 }
      }
      sourceCounts[source].total++
      
      if (correctIds.find(item => item.dbPlayer.id === player.id)) {
        sourceCounts[source].correct++
      } else if (incorrectIds.find(item => item.dbPlayer.id === player.id)) {
        sourceCounts[source].incorrect++
      } else {
        sourceCounts[source].missing++
      }
    })
    
    Object.entries(sourceCounts).forEach(([source, counts]) => {
      const accuracy = ((counts.correct / counts.total) * 100).toFixed(1)
      console.log(`${source}: ${counts.correct}/${counts.total} correct (${accuracy}%)`)
      if (counts.incorrect > 0) {
        console.log(`  - ${counts.incorrect} incorrect Yahoo IDs`)
      }
      if (counts.missing > 0) {
        console.log(`  - ${counts.missing} not found in Yahoo API`)
      }
    })
    
    const overallAccuracy = ((correctIds.length / dbPlayers.length) * 100).toFixed(1)
    console.log(`\n🎯 Overall Yahoo ID Accuracy: ${correctIds.length}/${dbPlayers.length} (${overallAccuracy}%)`)
    
    if (incorrectIds.length === 0) {
      console.log('\n🎉 SUCCESS: All Yahoo IDs in database match Yahoo API data!')
    } else {
      console.log(`\n⚠️ ${incorrectIds.length} players still have incorrect Yahoo IDs that need fixing`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()