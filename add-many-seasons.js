const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function addManySeasons() {
  try {
    console.log('🔄 Adding 20 seasons starting from 2026')
    console.log('=' .repeat(50))

    // Get the highest existing season ID
    const { data: existingSeasons, error: fetchError } = await supabase
      .from('seasons')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('Error fetching existing seasons:', fetchError)
      return
    }

    const startingId = existingSeasons.length > 0 ? existingSeasons[0].id + 1 : 20
    console.log(`Starting from season ID: ${startingId}`)

    const seasonsToAdd = []
    let currentId = startingId
    let currentYear = 2026

    // Generate 20 seasons
    for (let i = 0; i < 20; i++) {
      const nextYear = currentYear + 1
      seasonsToAdd.push({
        id: currentId,
        year: currentYear,
        name: `${currentYear}-${nextYear.toString().slice(-2)} Season`,
        is_active: false,
        is_active_assets: false
      })
      
      currentId++
      currentYear++
    }

    console.log('\nSeasons to add:')
    seasonsToAdd.forEach(season => {
      console.log(`  ID ${season.id}: ${season.name} (${season.year})`)
    })

    console.log('\nAdding seasons to database...')
    
    // Add seasons in batches to avoid overwhelming the database
    const batchSize = 5
    for (let i = 0; i < seasonsToAdd.length; i += batchSize) {
      const batch = seasonsToAdd.slice(i, i + batchSize)
      
      console.log(`\nBatch ${Math.floor(i / batchSize) + 1}: Adding seasons ${batch[0].id}-${batch[batch.length - 1].id}...`)
      
      const { error } = await supabase
        .from('seasons')
        .insert(batch)

      if (error) {
        console.error(`  ❌ Error adding batch:`, error)
        
        // Try adding individually if batch fails
        console.log('  Trying individual inserts...')
        for (const season of batch) {
          const { error: individualError } = await supabase
            .from('seasons')
            .insert([season])

          if (individualError) {
            if (individualError.code === '23505') {
              console.log(`    ⚠️  Season ${season.id} already exists`)
            } else {
              console.error(`    ❌ Error creating season ${season.id}:`, individualError)
            }
          } else {
            console.log(`    ✅ Created season ${season.id}: ${season.name}`)
          }
        }
      } else {
        console.log(`  ✅ Successfully added batch of ${batch.length} seasons`)
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Verify final count
    console.log('\n📊 Verifying final season count...')
    const { data: finalSeasons, error: finalError } = await supabase
      .from('seasons')
      .select('id, year, name')
      .order('id')

    if (finalError) {
      console.error('Error fetching final seasons:', finalError)
    } else {
      console.log(`\nTotal seasons in database: ${finalSeasons.length}`)
      console.log('Latest seasons:')
      finalSeasons.slice(-5).forEach(season => {
        console.log(`  ID ${season.id}: ${season.name} (${season.year})`)
      })
    }

    console.log('\n🎉 Season addition completed!')
    console.log(`\n📝 You can now use the admin "Start New Season" button`)
    console.log(`   to advance through multiple years for testing.`)

  } catch (error) {
    console.error('Error adding seasons:', error)
  }
}

console.log('🏀 UAFBL Bulk Season Addition')
console.log('============================')
console.log('This will add 20 seasons starting from 2026-27')
console.log('Each season will increment the year by 1')
console.log('')

addManySeasons()