const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function move20to19() {
  try {
    console.log('🔄 Final Step: Moving Season ID 20 → 19')
    console.log('=' .repeat(40))

    // Get current seasons
    const { data: seasons, error: fetchError } = await supabase
      .from('seasons')
      .select('*')
      .in('id', [19, 20])
      .order('id')
    
    if (fetchError) {
      console.error('Error fetching seasons:', fetchError)
      return
    }

    console.log('Current state:')
    seasons.forEach(s => {
      const activeLabel = s.is_active ? '(PLAYING)' : ''
      const assetsLabel = s.is_active_assets ? '(ASSETS)' : ''
      console.log(`  ID ${s.id}: ${s.year} ${activeLabel}${assetsLabel}`)
    })

    const season19 = seasons.find(s => s.id === 19)
    const season20 = seasons.find(s => s.id === 20)

    if (!season19 || !season20) {
      console.error('Missing required seasons')
      return
    }

    // Step 1: Move current ID 19 to temp ID 100
    console.log('\n1. Moving current ID 19 to temp ID 100...')
    
    const { error: temp19Error } = await supabase
      .from('seasons')
      .insert({
        id: 100,
        year: 7100,
        name: season19.name,
        is_active: season19.is_active,
        is_active_assets: season19.is_active_assets
      })

    if (temp19Error) {
      console.error('Error creating temp season 100:', temp19Error)
      return
    }

    // Update references from 19 to 100
    const tables = ['draft_results', 'managers_assets', 'rosters', 'trades', 'trades_old', 'toppers', 'projections']
    for (const table of tables) {
      await supabase.from(table).update({ season_id: 100 }).eq('season_id', 19)
    }
    await supabase.from('trades').update({ impacts_season_id: 100 }).eq('impacts_season_id', 19)

    // Delete old 19
    await supabase.from('seasons').delete().eq('id', 19)

    // Step 2: Move ID 20 to ID 19
    console.log('2. Moving ID 20 to ID 19...')
    
    const { error: new19Error } = await supabase
      .from('seasons')
      .insert({
        id: 19,
        year: 7019,
        name: season20.name,
        is_active: season20.is_active,
        is_active_assets: season20.is_active_assets
      })

    if (new19Error) {
      console.error('Error creating new season 19:', new19Error)
      return
    }

    // Update references from 20 to 19
    for (const table of tables) {
      await supabase.from(table).update({ season_id: 19 }).eq('season_id', 20)
    }
    await supabase.from('trades').update({ impacts_season_id: 19 }).eq('impacts_season_id', 20)

    // Delete old 20
    await supabase.from('seasons').delete().eq('id', 20)

    // Step 3: Move temp 100 to ID 18
    console.log('3. Moving temp ID 100 to ID 18...')
    
    const { error: new18Error } = await supabase
      .from('seasons')
      .insert({
        id: 18,
        year: 7018,
        name: season19.name,
        is_active: season19.is_active,
        is_active_assets: season19.is_active_assets
      })

    if (new18Error) {
      console.error('Error creating new season 18:', new18Error)
      return
    }

    // Update references from 100 to 18
    for (const table of tables) {
      await supabase.from(table).update({ season_id: 18 }).eq('season_id', 100)
    }
    await supabase.from('trades').update({ impacts_season_id: 18 }).eq('impacts_season_id', 100)

    // Delete temp 100
    await supabase.from('seasons').delete().eq('id', 100)

    // Step 4: Fix years
    console.log('4. Setting correct years...')
    await supabase.from('seasons').update({ year: season19.year }).eq('id', 18)
    await supabase.from('seasons').update({ year: season20.year }).eq('id', 19)

    // Verify
    console.log('\n✅ Final verification:')
    const { data: finalSeasons } = await supabase
      .from('seasons')
      .select('*')
      .in('id', [18, 19])
      .order('id')

    finalSeasons.forEach(s => {
      const activeLabel = s.is_active ? '(PLAYING)' : ''
      const assetsLabel = s.is_active_assets ? '(ASSETS)' : ''
      console.log(`  ID ${s.id}: ${s.year} ${activeLabel}${assetsLabel}`)
    })

    console.log('\n🎉 Perfect! Now we have:')
    console.log('- ID 18 (2024): Active playing season')
    console.log('- ID 19 (2025): Active assets season')

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

move20to19()