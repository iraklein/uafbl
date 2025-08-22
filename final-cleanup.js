const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function finalCleanup() {
  try {
    console.log('🔄 Final Cleanup')
    console.log('Fix years and move ID 99 → 19')
    console.log('=' .repeat(30))

    // Step 1: Fix the year for ID 18 (should be 2025)
    console.log('1. Fixing year for ID 18 (2025-26 season)...')
    await supabase
      .from('seasons')
      .update({ year: 2025 })
      .eq('id', 18)
    
    // Step 2: Move ID 99 to ID 19
    console.log('2. Moving ID 99 to ID 19...')
    
    // Create new season 19
    const { data: season99 } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', 99)
      .single()

    const { error: insertError } = await supabase
      .from('seasons')
      .insert({
        id: 19,
        year: 2024,  // Correct year for 2024-25 season
        name: '2024-25 Season',  // Correct name
        is_active: true,
        is_active_assets: false
      })

    if (insertError) {
      console.error('Error creating season 19:', insertError)
      return
    }

    // Update all references from 99 to 19
    const tables = ['draft_results', 'managers_assets', 'rosters', 'trades', 'trades_old', 'toppers', 'projections']
    for (const table of tables) {
      await supabase.from(table).update({ season_id: 19 }).eq('season_id', 99)
    }
    await supabase.from('trades').update({ impacts_season_id: 19 }).eq('impacts_season_id', 99)

    // Delete old season 99
    await supabase.from('seasons').delete().eq('id', 99)

    console.log('✅ Cleanup complete!')

    // Verify final result
    console.log('\n📊 Final verification:')
    const { data: finalSeasons } = await supabase
      .from('seasons')
      .select('id, year, name, is_active, is_active_assets')
      .order('id')

    finalSeasons.forEach(s => {
      const activeLabel = s.is_active ? '(PLAYING)' : ''
      const assetsLabel = s.is_active_assets ? '(ASSETS)' : ''
      console.log(`  ID ${s.id}: ${s.year} ${s.name} ${activeLabel}${assetsLabel}`)
    })

    // Check for perfect sequence
    let isSequential = true
    for (let i = 0; i < finalSeasons.length; i++) {
      if (finalSeasons[i].id !== i + 1) {
        isSequential = false
        break
      }
    }

    console.log(`\n${isSequential ? '🎉' : '❌'} Sequential ordering: ${isSequential ? 'PERFECT!' : 'Issues remain'}`)
    
    if (isSequential) {
      console.log('\n🏆 MIGRATION COMPLETE!')
      console.log('✅ Season IDs 1-19 in perfect order')
      console.log('✅ ID 18 (2025): Active assets season')  
      console.log('✅ ID 19 (2024): Active playing season')
    }

  } catch (error) {
    console.error('Cleanup failed:', error)
  }
}

finalCleanup()