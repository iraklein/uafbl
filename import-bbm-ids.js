#!/usr/bin/env node

/**
 * BBM IDs Import Script
 * Reads Basketball Monster player IDs from Excel file and prepares them for matching
 * 
 * Usage: node import-bbm-ids.js
 */

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// Configuration
const BBM_FILE = './BBM_IDs.xls'
const OUTPUT_FILE = './bbm-players-processed.json'

function main() {
  console.log('🏀 BBM Player IDs Import Script')
  console.log('================================')
  
  try {
    // Check if BBM file exists
    if (!fs.existsSync(BBM_FILE)) {
      console.error(`❌ BBM file not found: ${BBM_FILE}`)
      console.log('Please ensure BBM_IDs.xls is in the project root directory')
      process.exit(1)
    }
    
    console.log(`📖 Reading BBM file: ${BBM_FILE}`)
    
    // Read the Excel file
    const workbook = XLSX.readFile(BBM_FILE)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet)
    
    console.log(`📊 Found ${rawData.length} raw entries in BBM file`)
    
    if (rawData.length === 0) {
      console.error('❌ No data found in BBM file')
      process.exit(1)
    }
    
    // Log first few entries to understand structure
    console.log('\\n🔍 Sample entries:')
    rawData.slice(0, 3).forEach((entry, index) => {
      console.log(`Entry ${index + 1}:`, Object.keys(entry).map(key => `${key}: ${entry[key]}`).join(', '))
    })
    
    // Process and normalize the data
    const processedPlayers = rawData
      .map((row, index) => {
        try {
          // Try to extract player data - adjust these field names based on your Excel structure
          const possibleNameFields = ['Name', 'Player', 'Player Name', 'PLAYER', 'name', 'player_name']
          const possibleIdFields = ['ID', 'BBM_ID', 'BBM ID', 'Player ID', 'id', 'bbm_id', 'player_id']
          
          const nameField = possibleNameFields.find(field => row[field])
          const name = nameField ? row[nameField] : null
          const bbmIdField = possibleIdFields.find(field => row[field] != null)
          const bbmId = bbmIdField ? row[bbmIdField] : null
          
          if (!name && !bbmId) {
            console.warn(`⚠️ Row ${index + 1}: Could not find name or ID fields`)
            return null
          }
          
          const player = {
            bbm_id: bbmId ? parseInt(bbmId) : null,
            bbm_name: name ? String(name).trim() : null,
            original_row: row, // Keep original for debugging
            row_number: index + 1
          }
          
          // Debug logging for first few rows
          if (index < 5) {
            console.log(`DEBUG Row ${index + 1}:`, {
              nameField,
              name,
              bbmIdField, 
              bbmId,
              parsedId: parseInt(bbmId),
              isNaN: isNaN(parseInt(bbmId))
            })
          }
          
          // Validation
          if (!player.bbm_name) {
            console.warn(`⚠️ Row ${index + 1}: Missing player name`)
            return null
          }
          
          if (!player.bbm_id || isNaN(player.bbm_id)) {
            console.warn(`⚠️ Row ${index + 1}: Invalid BBM ID for ${player.bbm_name} (raw: ${bbmId}, parsed: ${parseInt(bbmId)})`)
            return null
          }
          
          return player
        } catch (error) {
          console.error(`❌ Error processing row ${index + 1}:`, error.message)
          return null
        }
      })
      .filter(Boolean) // Remove null entries
    
    console.log(`\\n✅ Processed ${processedPlayers.length} valid BBM players`)
    console.log(`❌ Skipped ${rawData.length - processedPlayers.length} invalid entries`)
    
    if (processedPlayers.length === 0) {
      console.error('❌ No valid players found after processing')
      process.exit(1)
    }
    
    // Show some statistics
    const stats = {
      totalPlayers: processedPlayers.length,
      playersWithBbmId: processedPlayers.filter(p => p.bbm_id).length,
      uniqueBbmIds: new Set(processedPlayers.map(p => p.bbm_id).filter(Boolean)).size,
      uniqueNames: new Set(processedPlayers.map(p => p.bbm_name?.toLowerCase()).filter(Boolean)).size
    }
    
    console.log('\\n📈 BBM Data Statistics:')
    console.log(`- Total players: ${stats.totalPlayers}`)
    console.log(`- Players with BBM ID: ${stats.playersWithBbmId}`)
    console.log(`- Unique BBM IDs: ${stats.uniqueBbmIds}`)
    console.log(`- Unique names: ${stats.uniqueNames}`)
    
    // Check for duplicates
    const bbmIdCounts = {}
    processedPlayers.forEach(player => {
      if (player.bbm_id) {
        bbmIdCounts[player.bbm_id] = (bbmIdCounts[player.bbm_id] || 0) + 1
      }
    })
    
    const duplicateBbmIds = Object.entries(bbmIdCounts)
      .filter(([id, count]) => count > 1)
      .map(([id, count]) => ({ id: parseInt(id), count }))
    
    if (duplicateBbmIds.length > 0) {
      console.log('\\n⚠️ Duplicate BBM IDs found:')
      duplicateBbmIds.forEach(({ id, count }) => {
        const players = processedPlayers.filter(p => p.bbm_id === id)
        console.log(`- BBM ID ${id}: ${count} players (${players.map(p => p.bbm_name).join(', ')})`)
      })
    }
    
    // Save processed data
    const outputData = {
      metadata: {
        processedAt: new Date().toISOString(),
        sourceFile: BBM_FILE,
        totalProcessed: processedPlayers.length,
        totalSkipped: rawData.length - processedPlayers.length,
        stats
      },
      players: processedPlayers
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2))
    console.log(`\\n💾 Saved processed data to: ${OUTPUT_FILE}`)
    
    console.log('\\n🎯 Next Steps:')
    console.log('1. Review the processed data in bbm-players-processed.json')
    console.log('2. Run the database migration: psql -f add-bbm-columns.sql')
    console.log('3. Run the matching script: node match-bbm-players.js')
    
  } catch (error) {
    console.error('❌ Error processing BBM file:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}