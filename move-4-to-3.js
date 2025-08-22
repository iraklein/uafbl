const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function move4to3() {
  try {
    console.log('🔄 Moving Season ID 4 → 3')
    console.log('=' .repeat(30))

    // Get season 4
    const { data: season4, error: fetchError } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', 4)
      .single()
    
    if (fetchError || !season4) {
      console.error('Season 4 not found:', fetchError)
      return
    }

    console.log(`Found: ${season4.name} (${season4.year})`)

    // Create temp season 3 with temp year
    const { error: insertError } = await supabase
      .from('seasons')
      .insert({
        id: 3,
        year: 7003,
        name: season4.name,
        is_active: season4.is_active,
        is_active_assets: season4.is_active_assets
      })

    if (insertError) {
      console.error('Error creating temp season:', insertError)
      return
    }

    // Update references
    const tables = ['draft_results', 'managers_assets', 'rosters', 'trades', 'trades_old', 'toppers', 'projections']
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .update({ season_id: 3 })
        .eq('season_id', 4)
      
      if (error) console.warn(`Warning ${table}:`, error.message)
    }

    // Update trades impacts_season_id
    await supabase
      .from('trades')
      .update({ impacts_season_id: 3 })
      .eq('impacts_season_id', 4)

    // Delete old season
    const { error: deleteError } = await supabase
      .from('seasons')
      .delete()
      .eq('id', 4)

    if (deleteError) {
      console.error('Error deleting season 4:', deleteError)
      return
    }

    // Fix year
    const { error: yearError } = await supabase
      .from('seasons')
      .update({ year: season4.year })
      .eq('id', 3)

    if (yearError) {
      console.error('Error fixing year:', yearError)
      return
    }

    console.log('✅ Successfully moved ID 4 → 3')

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

move4to3()