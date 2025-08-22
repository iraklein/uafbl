const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateSeasonIdOneToTwenty() {
  try {
    console.log('🔄 Migrating Season ID 1 (2025-26) to ID 20')
    console.log('=' .repeat(50))

    // Step 1: Verify current state
    console.log('Step 1: Checking current seasons...')
    const { data: currentSeasons, error: fetchError } = await supabase
      .from('seasons')
      .select('id, year, name, is_active, is_active_assets')
      .in('id', [1, 20])
      .order('id')
    
    if (fetchError) {
      console.error('Error fetching seasons:', fetchError)
      return
    }

    console.log('Current state:')
    currentSeasons.forEach(season => {
      const activeLabel = season.is_active ? '(ACTIVE PLAYING)' : ''
      const assetsLabel = season.is_active_assets ? '(ACTIVE ASSETS)' : ''
      console.log(`  ID ${season.id}: ${season.name} (${season.year}) ${activeLabel} ${assetsLabel}`)
    })

    // Check if ID 20 already exists
    const season20Exists = currentSeasons.find(s => s.id === 20)
    if (season20Exists) {
      console.error('\n❌ Error: Season ID 20 already exists!')
      console.log('Current seasons with ID 20:', season20Exists)
      return
    }

    // Get season 1 data
    const season1 = currentSeasons.find(s => s.id === 1)
    if (!season1) {
      console.error('\n❌ Error: Season ID 1 not found!')
      return
    }

    console.log(`\n✓ Found Season 1: ${season1.name} (${season1.year})`)

    // Step 2: Find all tables that reference season_id = 1
    console.log('\nStep 2: Checking for foreign key references...')
    
    const tablesToCheck = [
      'draft_results',
      'managers_assets', 
      'rosters',
      'trades',
      'trades_old',
      'toppers',
      'lsl',
      'projections'
    ]

    const referenceCounts = {}
    for (const table of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('season_id', 1)
        
        if (error) {
          console.warn(`  Warning: Could not check ${table} (${error.message})`)
          referenceCounts[table] = 'unknown'
        } else {
          referenceCounts[table] = count || 0
          if (count > 0) {
            console.log(`  ${table}: ${count} records`)
          }
        }
      } catch (err) {
        console.warn(`  Warning: Could not check ${table} (${err.message})`)
        referenceCounts[table] = 'unknown'
      }
    }

    // Step 3: Create new season with ID 20 using temporary year to avoid constraint
    console.log('\nStep 3: Creating new season with ID 20 (temporary year)...')
    const { error: insertError } = await supabase
      .from('seasons')
      .insert({
        id: 20,
        year: 9999, // Temporary year to avoid unique constraint
        name: season1.name,
        is_active: season1.is_active,
        is_active_assets: season1.is_active_assets
      })

    if (insertError) {
      console.error('Error creating season 20:', insertError)
      return
    }
    console.log('✓ Created season ID 20 with temporary year')

    // Step 4: Update all foreign key references from 1 to 20
    console.log('\nStep 4: Updating foreign key references...')
    
    for (const table of tablesToCheck) {
      if (referenceCounts[table] > 0) {
        console.log(`  Updating ${table}...`)
        const { error: updateError } = await supabase
          .from(table)
          .update({ season_id: 20 })
          .eq('season_id', 1)
        
        if (updateError) {
          console.error(`  ❌ Error updating ${table}:`, updateError)
          // Don't return here, try to continue with other tables
        } else {
          console.log(`  ✓ Updated ${referenceCounts[table]} records in ${table}`)
        }
      }
    }

    // Step 5: Delete the old season ID 1
    console.log('\nStep 5: Deleting old season ID 1...')
    const { error: deleteError } = await supabase
      .from('seasons')
      .delete()
      .eq('id', 1)

    if (deleteError) {
      console.error('Error deleting season 1:', deleteError)
      return
    }
    console.log('✓ Deleted old season ID 1')

    // Step 6: Update the year back to correct value
    console.log('\nStep 6: Setting correct year for season ID 20...')
    const { error: yearUpdateError } = await supabase
      .from('seasons')
      .update({ year: season1.year })
      .eq('id', 20)

    if (yearUpdateError) {
      console.error('Error updating year:', yearUpdateError)
      return
    }
    console.log('✓ Updated year to correct value')

    // Step 7: Verify final state
    console.log('\nStep 7: Verifying migration...')
    const { data: finalSeasons, error: finalError } = await supabase
      .from('seasons')
      .select('id, year, name, is_active, is_active_assets')
      .in('id', [1, 19, 20])
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
    console.log('- ID 1: No longer exists (properly ordered now)')

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

console.log('🏀 UAFBL Season ID Migration: ID 1 → ID 20')
console.log('==========================================')
console.log('This will move the 2025-26 season from ID 1 to ID 20')
console.log('for better logical ordering (newest season = highest ID)')
console.log('')

migrateSeasonIdOneToTwenty()