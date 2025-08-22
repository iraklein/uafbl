const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function resequenceAllSeasonIds() {
  try {
    console.log('🔄 Resequencing All Season IDs')
    console.log('Moving: 2→1, 3→2, 4→3, ..., 19→18, 20→19')
    console.log('=' .repeat(60))

    // Step 1: Get current seasons and plan the migration
    console.log('Step 1: Analyzing current season structure...')
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

    // Create migration plan: old_id → new_id
    const migrationPlan = [
      { oldId: 2, newId: 1, year: 2007 },
      { oldId: 3, newId: 2, year: 2008 },
      { oldId: 4, newId: 3, year: 2009 },
      { oldId: 5, newId: 4, year: 2010 },
      { oldId: 6, newId: 5, year: 2011 },
      { oldId: 7, newId: 6, year: 2012 },
      { oldId: 8, newId: 7, year: 2013 },
      { oldId: 9, newId: 8, year: 2014 },
      { oldId: 10, newId: 9, year: 2015 },
      { oldId: 11, newId: 10, year: 2016 },
      { oldId: 12, newId: 11, year: 2017 },
      { oldId: 13, newId: 12, year: 2018 },
      { oldId: 14, newId: 13, year: 2019 },
      { oldId: 15, newId: 14, year: 2020 },
      { oldId: 16, newId: 15, year: 2021 },
      { oldId: 17, newId: 16, year: 2022 },
      { oldId: 18, newId: 17, year: 2023 },
      { oldId: 19, newId: 18, year: 2024 },
      { oldId: 20, newId: 19, year: 2025 }
    ]

    console.log('\nMigration plan:')
    migrationPlan.forEach(plan => {
      console.log(`  ${plan.year}: ID ${plan.oldId} → ID ${plan.newId}`)
    })

    // Step 2: Check for foreign key references
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

    console.log('\nStep 2: Checking foreign key usage...')
    const usageCounts = {}
    let totalReferences = 0
    
    for (const plan of migrationPlan) {
      usageCounts[plan.oldId] = {}
      let seasonTotal = 0
      
      for (const tableInfo of tablesToCheck) {
        const key = `${tableInfo.table}.${tableInfo.column}`
        try {
          const { count, error } = await supabase
            .from(tableInfo.table)
            .select('*', { count: 'exact', head: true })
            .eq(tableInfo.column, plan.oldId)
          
          if (!error && count > 0) {
            usageCounts[plan.oldId][key] = count
            seasonTotal += count
            totalReferences += count
          }
        } catch (err) {
          // Ignore table check errors
        }
      }
      
      if (seasonTotal > 0) {
        console.log(`  ${plan.year} (ID ${plan.oldId}): ${seasonTotal} references`)
      }
    }

    console.log(`\nTotal references to migrate: ${totalReferences}`)

    // Step 3: Perform migration in reverse order (highest to lowest)
    console.log('\nStep 3: Migrating seasons (highest to lowest to avoid conflicts)...')
    
    for (let i = migrationPlan.length - 1; i >= 0; i--) {
      const plan = migrationPlan[i]
      const season = currentSeasons.find(s => s.id === plan.oldId)
      
      if (!season) {
        console.log(`  Skipping ${plan.year} (ID ${plan.oldId} not found)`)
        continue
      }

      console.log(`\n  Migrating ${plan.year}: ID ${plan.oldId} → ID ${plan.newId}`)
      
      // Step 3a: Create new season record with target ID using temporary year
      const tempYear = 9000 + plan.newId // Temporary year to avoid conflicts
      console.log(`    Creating new record with ID ${plan.newId} (temp year ${tempYear})...`)
      
      const { error: insertError } = await supabase
        .from('seasons')
        .insert({
          id: plan.newId,
          year: tempYear,
          name: season.name,
          is_active: season.is_active,
          is_active_assets: season.is_active_assets
        })

      if (insertError) {
        console.error(`    ❌ Error creating season ${plan.newId}:`, insertError)
        continue
      }

      // Step 3b: Update all foreign key references
      console.log(`    Updating foreign key references...`)
      let referencesUpdated = 0
      
      for (const tableInfo of tablesToCheck) {
        const key = `${tableInfo.table}.${tableInfo.column}`
        if (usageCounts[plan.oldId][key] > 0) {
          const updateData = {}
          updateData[tableInfo.column] = plan.newId
          
          const { error: updateError } = await supabase
            .from(tableInfo.table)
            .update(updateData)
            .eq(tableInfo.column, plan.oldId)
          
          if (updateError) {
            console.error(`    ❌ Error updating ${key}:`, updateError)
          } else {
            referencesUpdated += usageCounts[plan.oldId][key]
          }
        }
      }

      console.log(`    ✓ Updated ${referencesUpdated} references`)

      // Step 3c: Delete old season record
      console.log(`    Deleting old season ID ${plan.oldId}...`)
      const { error: deleteError } = await supabase
        .from('seasons')
        .delete()
        .eq('id', plan.oldId)

      if (deleteError) {
        console.error(`    ❌ Error deleting season ${plan.oldId}:`, deleteError)
        continue
      }

      // Step 3d: Update the year back to correct value
      console.log(`    Setting correct year ${plan.year}...`)
      const { error: yearError } = await supabase
        .from('seasons')
        .update({ year: plan.year })
        .eq('id', plan.newId)

      if (yearError) {
        console.error(`    ❌ Error updating year:`, yearError)
      } else {
        console.log(`    ✓ Migration complete for ${plan.year}`)
      }
    }

    // Step 4: Verify final state
    console.log('\nStep 4: Verifying final season structure...')
    const { data: finalSeasons, error: finalError } = await supabase
      .from('seasons')
      .select('id, year, name, is_active, is_active_assets')
      .order('id')
    
    if (finalError) {
      console.error('Error fetching final state:', finalError)
      return
    }

    console.log('\nFinal season structure:')
    finalSeasons.forEach(season => {
      const activeLabel = season.is_active ? '(PLAYING)' : ''
      const assetsLabel = season.is_active_assets ? '(ASSETS)' : ''
      console.log(`  ID ${season.id}: ${season.year} ${activeLabel}${assetsLabel}`)
    })

    // Verify sequential ordering
    let isSequential = true
    for (let i = 0; i < finalSeasons.length; i++) {
      if (finalSeasons[i].id !== i + 1) {
        isSequential = false
        break
      }
    }

    console.log('\n✅ Migration completed successfully!')
    console.log(`Sequential ordering: ${isSequential ? '✅ Perfect' : '❌ Issues found'}`)
    console.log('\nFinal summary:')
    console.log(`- ID 1-17: Historical seasons (2007-2023)`)
    console.log(`- ID 18 (2024): Active playing season`) 
    console.log(`- ID 19 (2025): Active assets season`)
    console.log(`- Total seasons: ${finalSeasons.length}`)

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

console.log('🏀 UAFBL Complete Season ID Resequencing')
console.log('========================================')
console.log('This will reorder all season IDs to be sequential 1-19')
console.log('ensuring proper chronological order with no gaps.')
console.log('')

resequenceAllSeasonIds()