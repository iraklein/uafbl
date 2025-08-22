const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function resequenceSeasons() {
  try {
    console.log('🔄 Resequencing Season IDs to 1-19')
    console.log('=' .repeat(50))

    // Step 1: Get current seasons
    console.log('Step 1: Getting current seasons...')
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

    // Step 2: Create all new seasons with temporary high IDs first
    console.log('\nStep 2: Creating new seasons with temporary IDs...')
    const tempIdStart = 1000
    
    for (let i = 0; i < currentSeasons.length; i++) {
      const season = currentSeasons[i]
      const tempId = tempIdStart + i + 1 // 1001, 1002, 1003, etc.
      const finalId = i + 1 // 1, 2, 3, etc.
      
      console.log(`  Creating temp ID ${tempId} for ${season.year} (final: ${finalId})`)
      
      const { error: insertError } = await supabase
        .from('seasons')
        .insert({
          id: tempId,
          year: season.year,
          name: season.name,
          is_active: season.is_active,
          is_active_assets: season.is_active_assets
        })

      if (insertError) {
        console.error(`  ❌ Error creating temp season ${tempId}:`, insertError)
        return
      }
    }

    // Step 3: Update all foreign key references to use temp IDs
    console.log('\nStep 3: Updating foreign key references to temp IDs...')
    
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

    for (let i = 0; i < currentSeasons.length; i++) {
      const season = currentSeasons[i]
      const tempId = tempIdStart + i + 1
      const oldId = season.id
      
      console.log(`  Updating references: ${season.year} (${oldId} → ${tempId})`)
      
      for (const tableInfo of tablesToUpdate) {
        const updateData = {}
        updateData[tableInfo.column] = tempId
        
        const { count, error: updateError } = await supabase
          .from(tableInfo.table)
          .update(updateData)
          .eq(tableInfo.column, oldId)
        
        if (updateError) {
          console.warn(`    Warning: ${tableInfo.table}.${tableInfo.column}: ${updateError.message}`)
        } else if (count > 0) {
          console.log(`    ✓ ${tableInfo.table}.${tableInfo.column}: ${count} records`)
        }
      }
    }

    // Step 4: Delete all original seasons
    console.log('\nStep 4: Deleting original seasons...')
    for (const season of currentSeasons) {
      console.log(`  Deleting original ID ${season.id} (${season.year})`)
      
      const { error: deleteError } = await supabase
        .from('seasons')
        .delete()
        .eq('id', season.id)

      if (deleteError) {
        console.error(`  ❌ Error deleting season ${season.id}:`, deleteError)
        return
      }
    }

    // Step 5: Update temp seasons to final IDs
    console.log('\nStep 5: Updating temp seasons to final IDs...')
    
    for (let i = 0; i < currentSeasons.length; i++) {
      const tempId = tempIdStart + i + 1
      const finalId = i + 1
      const season = currentSeasons[i]
      
      console.log(`  ${season.year}: temp ID ${tempId} → final ID ${finalId}`)
      
      const { error: updateError } = await supabase
        .from('seasons')
        .update({ id: finalId })
        .eq('id', tempId)

      if (updateError) {
        console.error(`  ❌ Error updating season to final ID:`, updateError)
        return
      }
    }

    // Step 6: Update all foreign key references to final IDs
    console.log('\nStep 6: Updating foreign key references to final IDs...')
    
    for (let i = 0; i < currentSeasons.length; i++) {
      const tempId = tempIdStart + i + 1
      const finalId = i + 1
      const season = currentSeasons[i]
      
      console.log(`  Updating references: ${season.year} (temp ${tempId} → final ${finalId})`)
      
      for (const tableInfo of tablesToUpdate) {
        const updateData = {}
        updateData[tableInfo.column] = finalId
        
        const { count, error: updateError } = await supabase
          .from(tableInfo.table)
          .update(updateData)
          .eq(tableInfo.column, tempId)
        
        if (updateError) {
          console.warn(`    Warning: ${tableInfo.table}.${tableInfo.column}: ${updateError.message}`)
        } else if (count > 0) {
          console.log(`    ✓ ${tableInfo.table}.${tableInfo.column}: ${count} records`)
        }
      }
    }

    // Step 7: Verify final result
    console.log('\nStep 7: Verifying final structure...')
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

    // Verify sequential ordering
    let isSequential = true
    for (let i = 0; i < finalSeasons.length; i++) {
      if (finalSeasons[i].id !== i + 1) {
        isSequential = false
        break
      }
    }

    console.log('\n✅ Resequencing completed successfully!')
    console.log(`Sequential ordering: ${isSequential ? '✅ Perfect (1-19)' : '❌ Issues found'}`)
    console.log('\nFinal summary:')
    console.log(`- ID 1-17: Historical seasons (2007-2023)`)
    console.log(`- ID 18 (2024): Active playing season`) 
    console.log(`- ID 19 (2025): Active assets season`)
    console.log(`- Total seasons: ${finalSeasons.length}`)

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

console.log('🏀 UAFBL Season ID Resequencing (Fixed)')
console.log('=====================================')
console.log('This will cleanly reorder all season IDs to 1-19')
console.log('')

resequenceSeasons()