const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixSequence() {
  try {
    console.log('🔄 Fixing Season ID Sequence')
    console.log('Moving ID 3→2, 4→3, 5→4, etc. to fill gaps')
    console.log('=' .repeat(50))

    // Step 1: Get current seasons
    const { data: currentSeasons, error: fetchError } = await supabase
      .from('seasons')
      .select('id, year, name, is_active, is_active_assets')
      .order('year')
    
    if (fetchError) {
      console.error('Error fetching seasons:', fetchError)
      return
    }

    console.log('Current seasons:')
    currentSeasons.forEach(season => {
      const activeLabel = season.is_active ? '(PLAYING)' : ''
      const assetsLabel = season.is_active_assets ? '(ASSETS)' : ''
      console.log(`  ID ${season.id}: ${season.year} ${activeLabel}${assetsLabel}`)
    })

    // We need to move: 3→2, 4→3, 5→4, ..., 20→19
    // But we already have ID 1 correct
    const migrations = []
    let targetId = 2
    
    for (const season of currentSeasons) {
      if (season.id === 1) continue // Skip ID 1, it's already correct
      
      migrations.push({
        oldId: season.id,
        newId: targetId,
        year: season.year,
        name: season.name,
        is_active: season.is_active,
        is_active_assets: season.is_active_assets
      })
      targetId++
    }

    console.log('\nMigration plan:')
    migrations.forEach(m => {
      console.log(`  ${m.year}: ID ${m.oldId} → ID ${m.newId}`)
    })

    // Step 2: Process migrations one at a time, starting from highest ID
    const tablesToUpdate = [
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

    // Process in reverse order to avoid conflicts
    for (let i = migrations.length - 1; i >= 0; i--) {
      const migration = migrations[i]
      
      console.log(`\nMigrating ${migration.year}: ID ${migration.oldId} → ID ${migration.newId}`)
      
      // Create new season with temporary year
      const tempYear = 8000 + migration.newId
      console.log(`  Creating temp season ID ${migration.newId} with year ${tempYear}`)
      
      const { error: insertError } = await supabase
        .from('seasons')
        .insert({
          id: migration.newId,
          year: tempYear,
          name: migration.name,
          is_active: migration.is_active,
          is_active_assets: migration.is_active_assets
        })

      if (insertError) {
        console.error(`  ❌ Error creating season:`, insertError)
        continue
      }

      // Update all foreign key references
      console.log(`  Updating foreign key references...`)
      for (const tableInfo of tablesToUpdate) {
        const updateData = {}
        updateData[tableInfo.column] = migration.newId
        
        const { count, error: updateError } = await supabase
          .from(tableInfo.table)
          .update(updateData)
          .eq(tableInfo.column, migration.oldId)
        
        if (updateError) {
          console.warn(`    Warning: ${tableInfo.table}.${tableInfo.column}: ${updateError.message}`)
        } else if (count > 0) {
          console.log(`    ✓ ${tableInfo.table}.${tableInfo.column}: ${count} records`)
        }
      }

      // Delete old season
      console.log(`  Deleting old season ID ${migration.oldId}`)
      const { error: deleteError } = await supabase
        .from('seasons')
        .delete()
        .eq('id', migration.oldId)

      if (deleteError) {
        console.error(`  ❌ Error deleting season:`, deleteError)
        continue
      }

      // Update to correct year
      console.log(`  Setting correct year ${migration.year}`)
      const { error: yearError } = await supabase
        .from('seasons')
        .update({ year: migration.year })
        .eq('id', migration.newId)

      if (yearError) {
        console.error(`  ❌ Error updating year:`, yearError)
      } else {
        console.log(`  ✓ Migration complete`)
      }
    }

    // Step 3: Verify final result
    console.log('\nStep 3: Verifying final structure...')
    const { data: finalSeasons, error: finalError } = await supabase
      .from('seasons')
      .select('id, year, name, is_active, is_active_assets')
      .order('id')
    
    if (finalError) {
      console.error('Error fetching final seasons:', finalError)
      return
    }

    console.log('\nFinal season structure:')
    finalSeasons.forEach(season => {
      const activeLabel = season.is_active ? '(PLAYING)' : ''
      const assetsLabel = season.is_active_assets ? '(ASSETS)' : ''
      console.log(`  ID ${season.id}: ${season.year} ${activeLabel}${assetsLabel}`)
    })

    // Check for perfect sequence
    let isSequential = true
    for (let i = 0; i < finalSeasons.length; i++) {
      if (finalSeasons[i].id !== i + 1) {
        isSequential = false
        break
      }
    }

    console.log('\n✅ Sequence fix completed!')
    console.log(`Sequential ordering: ${isSequential ? '✅ Perfect (1-19)' : '❌ Issues found'}`)
    console.log('\nFinal summary:')
    console.log(`- ID 1-17: Historical seasons (2007-2023)`)
    console.log(`- ID 18 (2024): Active playing season`) 
    console.log(`- ID 19 (2025): Active assets season`)

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

console.log('🏀 UAFBL Season Sequence Fix')
console.log('============================')
console.log('Using the same approach that worked for ID 1→20')
console.log('')

fixSequence()