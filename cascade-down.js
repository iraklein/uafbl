const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function cascadeDown() {
  try {
    console.log('🔄 Cascading Season IDs Down')
    console.log('5→4, 6→5, 7→6, 8→7, etc.')
    console.log('=' .repeat(35))

    // Get all seasons that need to move
    const { data: seasons, error: fetchError } = await supabase
      .from('seasons')
      .select('*')
      .gte('id', 5)
      .order('id')
    
    if (fetchError) {
      console.error('Error fetching seasons:', fetchError)
      return
    }

    console.log('Seasons to migrate:')
    seasons.forEach(s => {
      const targetId = s.id - 1
      console.log(`  ID ${s.id} (${s.year}) → ID ${targetId}`)
    })

    const tables = ['draft_results', 'managers_assets', 'rosters', 'trades', 'trades_old', 'toppers', 'projections']

    // Process each season individually, starting from lowest ID
    for (const season of seasons) {
      const oldId = season.id
      const newId = oldId - 1
      
      console.log(`\nMigrating ${season.year}: ID ${oldId} → ID ${newId}`)
      
      // Create new season with temp year
      const tempYear = 6000 + newId
      console.log(`  Creating temp season ID ${newId} with year ${tempYear}`)
      
      const { error: insertError } = await supabase
        .from('seasons')
        .insert({
          id: newId,
          year: tempYear,
          name: season.name,
          is_active: season.is_active,
          is_active_assets: season.is_active_assets
        })

      if (insertError) {
        console.error(`  ❌ Error creating season:`, insertError)
        continue
      }

      // Update all foreign key references
      console.log(`  Updating foreign key references...`)
      for (const table of tables) {
        const { count, error: updateError } = await supabase
          .from(table)
          .update({ season_id: newId })
          .eq('season_id', oldId)
        
        if (updateError) {
          console.warn(`    Warning ${table}:`, updateError.message)
        } else if (count > 0) {
          console.log(`    ✓ ${table}: ${count} records`)
        }
      }

      // Update trades impacts_season_id
      const { count: tradesCount } = await supabase
        .from('trades')
        .update({ impacts_season_id: newId })
        .eq('impacts_season_id', oldId)
      
      if (tradesCount > 0) {
        console.log(`    ✓ trades.impacts_season_id: ${tradesCount} records`)
      }

      // Delete old season
      console.log(`  Deleting old season ID ${oldId}`)
      const { error: deleteError } = await supabase
        .from('seasons')
        .delete()
        .eq('id', oldId)

      if (deleteError) {
        console.error(`  ❌ Error deleting season:`, deleteError)
        continue
      }

      // Fix year
      console.log(`  Setting correct year ${season.year}`)
      const { error: yearError } = await supabase
        .from('seasons')
        .update({ year: season.year })
        .eq('id', newId)

      if (yearError) {
        console.error(`  ❌ Error updating year:`, yearError)
      } else {
        console.log(`  ✅ Migration complete`)
      }
    }

    // Verify final result
    console.log('\n📊 Final verification:')
    const { data: finalSeasons } = await supabase
      .from('seasons')
      .select('id, year, name, is_active, is_active_assets')
      .order('id')

    finalSeasons.forEach(s => {
      const activeLabel = s.is_active ? '(PLAYING)' : ''
      const assetsLabel = s.is_active_assets ? '(ASSETS)' : ''
      console.log(`  ID ${s.id}: ${s.year} ${activeLabel}${assetsLabel}`)
    })

    // Check for perfect sequence
    let isSequential = true
    for (let i = 0; i < finalSeasons.length; i++) {
      if (finalSeasons[i].id !== i + 1) {
        isSequential = false
        break
      }
    }

    console.log(`\n${isSequential ? '✅' : '❌'} Sequential ordering: ${isSequential ? 'Perfect (1-19)' : 'Issues remain'}`)

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

cascadeDown()