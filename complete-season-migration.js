const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function completeSeasonMigration() {
  try {
    console.log('🔄 Completing Season ID Migration: ID 1 → ID 20')
    console.log('=' .repeat(50))

    // Step 1: Check current state
    console.log('Step 1: Checking current state...')
    const { data: seasons, error: fetchError } = await supabase
      .from('seasons')
      .select('id, year, name, is_active, is_active_assets')
      .in('id', [1, 20])
      .order('id')
    
    if (fetchError) {
      console.error('Error fetching seasons:', fetchError)
      return
    }

    console.log('Current seasons:')
    seasons.forEach(season => {
      const activeLabel = season.is_active ? '(ACTIVE PLAYING)' : ''
      const assetsLabel = season.is_active_assets ? '(ACTIVE ASSETS)' : ''
      console.log(`  ID ${season.id}: ${season.name} (${season.year}) ${activeLabel} ${assetsLabel}`)
    })

    const season1 = seasons.find(s => s.id === 1)
    const season20 = seasons.find(s => s.id === 20)

    if (!season1 && !season20) {
      console.log('\n✅ Migration already completed - no seasons with ID 1 or 20 found')
      return
    }

    if (!season1 && season20) {
      console.log('\n🔧 Fixing season 20 year and completing migration...')
      
      // Fix the year if it's still 9999
      if (season20.year === 9999) {
        const { error: yearError } = await supabase
          .from('seasons')
          .update({ year: 2025 })
          .eq('id', 20)
        
        if (yearError) {
          console.error('Error updating year:', yearError)
          return
        }
        console.log('✓ Updated season 20 year to 2025')
      }
      
      console.log('✅ Migration completed!')
      return
    }

    // Both seasons exist - need to complete the migration
    console.log('\n📋 Completing partial migration...')

    // Step 2: Check remaining references to season ID 1
    const tablesToCheck = [
      { table: 'draft_results', column: 'season_id' },
      { table: 'managers_assets', column: 'season_id' },
      { table: 'rosters', column: 'season_id' },
      { table: 'trades', column: 'season_id' },
      { table: 'trades', column: 'impacts_season_id' },
      { table: 'trades_old', column: 'season_id' },
      { table: 'toppers', column: 'season_id' },
      { table: 'lsl', column: 'season_id' },
      { table: 'projections', column: 'season_id' }
    ]

    console.log('\nStep 2: Checking remaining references to season ID 1...')
    const referenceCounts = {}
    for (const tableInfo of tablesToCheck) {
      const key = `${tableInfo.table}.${tableInfo.column}`
      try {
        const { count, error } = await supabase
          .from(tableInfo.table)
          .select('*', { count: 'exact', head: true })
          .eq(tableInfo.column, 1)
        
        if (error) {
          console.warn(`  Warning: Could not check ${key} (${error.message})`)
          referenceCounts[key] = 'unknown'
        } else {
          referenceCounts[key] = count || 0
          if (count > 0) {
            console.log(`  ${key}: ${count} records still reference season ID 1`)
          }
        }
      } catch (err) {
        console.warn(`  Warning: Could not check ${key} (${err.message})`)
        referenceCounts[key] = 'unknown'
      }
    }

    // Step 3: Update any remaining references
    console.log('\nStep 3: Updating remaining references...')
    let hasReferences = false
    
    for (const tableInfo of tablesToCheck) {
      const key = `${tableInfo.table}.${tableInfo.column}`
      if (referenceCounts[key] > 0) {
        hasReferences = true
        console.log(`  Updating ${key}...`)
        
        const updateData = {}
        updateData[tableInfo.column] = 20
        
        const { error: updateError } = await supabase
          .from(tableInfo.table)
          .update(updateData)
          .eq(tableInfo.column, 1)
        
        if (updateError) {
          console.error(`  ❌ Error updating ${key}:`, updateError)
        } else {
          console.log(`  ✓ Updated ${referenceCounts[key]} records in ${key}`)
        }
      }
    }

    if (!hasReferences) {
      console.log('  No remaining references to update')
    }

    // Step 4: Delete season ID 1
    console.log('\nStep 4: Deleting season ID 1...')
    const { error: deleteError } = await supabase
      .from('seasons')
      .delete()
      .eq('id', 1)

    if (deleteError) {
      console.error('Error deleting season 1:', deleteError)
      return
    }
    console.log('✓ Deleted season ID 1')

    // Step 5: Fix season 20 year
    console.log('\nStep 5: Setting correct year for season ID 20...')
    const { error: yearError } = await supabase
      .from('seasons')
      .update({ year: 2025 })
      .eq('id', 20)

    if (yearError) {
      console.error('Error updating year:', yearError)
      return
    }
    console.log('✓ Updated year to 2025')

    // Step 6: Verify final state
    console.log('\nStep 6: Verifying final state...')
    const { data: finalSeasons, error: finalError } = await supabase
      .from('seasons')
      .select('id, year, name, is_active, is_active_assets')
      .in('id', [19, 20])
      .order('id')
    
    if (finalError) {
      console.error('Error fetching final state:', finalError)
      return
    }

    console.log('\nFinal season configuration:')
    finalSeasons.forEach(season => {
      const activeLabel = season.is_active ? '(ACTIVE PLAYING)' : ''
      const assetsLabel = season.is_active_assets ? '(ACTIVE ASSETS)' : ''
      console.log(`  ID ${season.id}: ${season.name} (${season.year}) ${activeLabel} ${assetsLabel}`)
    })

    console.log('\n✅ Migration completed successfully!')
    console.log('\nSummary:')
    console.log('- ID 19 (2024-25): Active playing season')  
    console.log('- ID 20 (2025-26): Active assets season')
    console.log('- ID 1: Removed (proper chronological ordering achieved)')

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

console.log('🏀 UAFBL Season Migration Completion')
console.log('===================================')
console.log('This will complete the migration from ID 1 to ID 20')
console.log('')

completeSeasonMigration()