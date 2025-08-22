const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function swap18and19() {
  try {
    console.log('🔄 Swapping Season IDs to Fix Order')
    console.log('18→20, 19→18, 20→19')
    console.log('=' .repeat(35))

    // Step 1: Move 18 to temporary 20
    console.log('1. Moving ID 18 (2025) to temp ID 20...')
    
    const { data: season18 } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', 18)
      .single()

    const { error: temp20Error } = await supabase
      .from('seasons')
      .insert({
        id: 20,
        year: 8020,
        name: season18.name,
        is_active: season18.is_active,
        is_active_assets: season18.is_active_assets
      })

    if (temp20Error) {
      console.error('Error creating temp 20:', temp20Error)
      return
    }

    // Update references 18→20
    const tables = ['draft_results', 'managers_assets', 'rosters', 'trades', 'trades_old', 'toppers', 'projections']
    for (const table of tables) {
      await supabase.from(table).update({ season_id: 20 }).eq('season_id', 18)
    }
    await supabase.from('trades').update({ impacts_season_id: 20 }).eq('impacts_season_id', 18)

    // Delete old 18
    await supabase.from('seasons').delete().eq('id', 18)

    // Step 2: Move 19 to 18
    console.log('2. Moving ID 19 (2024) to ID 18...')
    
    const { data: season19 } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', 19)
      .single()

    const { error: new18Error } = await supabase
      .from('seasons')
      .insert({
        id: 18,
        year: 8018,
        name: season19.name,
        is_active: season19.is_active,
        is_active_assets: season19.is_active_assets
      })

    if (new18Error) {
      console.error('Error creating new 18:', new18Error)
      return
    }

    // Update references 19→18
    for (const table of tables) {
      await supabase.from(table).update({ season_id: 18 }).eq('season_id', 19)
    }
    await supabase.from('trades').update({ impacts_season_id: 18 }).eq('impacts_season_id', 19)

    // Delete old 19
    await supabase.from('seasons').delete().eq('id', 19)

    // Step 3: Move temp 20 to 19
    console.log('3. Moving temp ID 20 (2025) to ID 19...')
    
    const { error: new19Error } = await supabase
      .from('seasons')
      .insert({
        id: 19,
        year: 8019,
        name: season18.name,
        is_active: season18.is_active,
        is_active_assets: season18.is_active_assets
      })

    if (new19Error) {
      console.error('Error creating new 19:', new19Error)
      return
    }

    // Update references 20→19
    for (const table of tables) {
      await supabase.from(table).update({ season_id: 19 }).eq('season_id', 20)
    }
    await supabase.from('trades').update({ impacts_season_id: 19 }).eq('impacts_season_id', 20)

    // Delete temp 20
    await supabase.from('seasons').delete().eq('id', 20)

    // Step 4: Fix years
    console.log('4. Setting correct years...')
    await supabase.from('seasons').update({ year: 2024 }).eq('id', 18)  // 2024-25 season
    await supabase.from('seasons').update({ year: 2025 }).eq('id', 19)  // 2025-26 season

    // Verify
    console.log('\n✅ Final verification:')
    const { data: finalSeasons } = await supabase
      .from('seasons')
      .select('id, year, name, is_active, is_active_assets')
      .in('id', [17, 18, 19])
      .order('id')

    finalSeasons.forEach(s => {
      const activeLabel = s.is_active ? '(PLAYING)' : ''
      const assetsLabel = s.is_active_assets ? '(ASSETS)' : ''
      console.log(`  ID ${s.id}: ${s.year} ${s.name} ${activeLabel}${assetsLabel}`)
    })

    console.log('\n🎉 Perfect chronological order!')
    console.log('- ID 18 (2024): Active playing season')
    console.log('- ID 19 (2025): Active assets season')

  } catch (error) {
    console.error('Swap failed:', error)
  }
}

swap18and19()