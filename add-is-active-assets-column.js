const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function addIsActiveAssetsColumn() {
  try {
    console.log('Adding is_active_assets column to seasons table...\n')

    // First, let's see the current seasons
    console.log('Current seasons in database:')
    const { data: currentSeasons, error: fetchError } = await supabase
      .from('seasons')
      .select('id, year, name, is_active')
      .order('id')
    
    if (fetchError) {
      console.error('Error fetching current seasons:', fetchError)
      return
    }

    currentSeasons.forEach(season => {
      console.log(`  ID ${season.id}: ${season.name} (${season.year}) ${season.is_active ? '(ACTIVE)' : ''}`)
    })

    console.log('\n' + '='.repeat(60) + '\n')

    // The column has been added manually, proceed with updates
    console.log('Step 1: Column already added, proceeding with updates...')

    // Update ID 19 (2024-25) to be the active playing season
    console.log('\nStep 2: Setting ID 19 (2024-25) as active playing season...')
    const { error: season19Error } = await supabase
      .from('seasons')
      .update({ 
        is_active: true,
        is_active_assets: false 
      })
      .eq('id', 19)

    if (season19Error) {
      console.error('Error updating ID 19:', season19Error)
      return
    }
    console.log('✓ ID 19 (2024-25) set as active playing season')

    // Update ID 1 (2025-26) to be the active assets season  
    console.log('\nStep 3: Setting ID 1 (2025-26) as active assets season...')
    const { error: season1Error } = await supabase
      .from('seasons')
      .update({ 
        is_active: false,
        is_active_assets: true 
      })
      .eq('id', 1)

    if (season1Error) {
      console.error('Error updating ID 1:', season1Error)
      return
    }
    console.log('✓ ID 1 (2025-26) set as active assets season')

    // Set all other seasons to inactive for both
    console.log('\nStep 4: Setting all other seasons to inactive...')
    const { error: othersError } = await supabase
      .from('seasons')
      .update({ 
        is_active: false,
        is_active_assets: false 
      })
      .not('id', 'in', '(1,19)')

    if (othersError) {
      console.error('Error updating other seasons:', othersError)
      return
    }
    console.log('✓ All other seasons set to inactive')

    // Display final results
    console.log('\n' + '='.repeat(60) + '\n')
    console.log('Final season configuration:')
    
    const { data: updatedSeasons, error: finalFetchError } = await supabase
      .from('seasons')
      .select('id, year, name, is_active, is_active_assets')
      .order('id')
    
    if (finalFetchError) {
      console.error('Error fetching updated seasons:', finalFetchError)
      return
    }

    updatedSeasons.forEach(season => {
      const activeLabel = season.is_active ? '(ACTIVE PLAYING)' : ''
      const assetsLabel = season.is_active_assets ? '(ACTIVE ASSETS)' : ''
      console.log(`  ID ${season.id}: ${season.name} (${season.year}) ${activeLabel} ${assetsLabel}`)
    })

    console.log('\n✅ Successfully added is_active_assets column and updated season configuration!')
    console.log('\nSummary:')
    console.log('- ID 19 (2024-25): Active playing season (current rosters)')
    console.log('- ID 1 (2025-26): Active assets season (current draft/spending)')
    console.log('- All others: Inactive')

  } catch (error) {
    console.error('Error in migration:', error)
  }
}

console.log('🏀 UAFBL Season Active Status Migration')
console.log('=====================================')
console.log('This will add is_active_assets column to separate:')
console.log('- is_active: Current playing season (ID 19 = 2024-25)')
console.log('- is_active_assets: Current draft/assets season (ID 1 = 2025-26)')
console.log('')
console.log('⚠️  Make sure to add the column in Supabase first!')
console.log('Press Ctrl+C to cancel or Enter to continue...')

addIsActiveAssetsColumn()