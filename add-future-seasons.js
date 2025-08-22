const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function addFutureSeasons() {
  try {
    console.log('🔄 Adding future seasons for testing')
    console.log('=' .repeat(40))

    const futureSeasons = [
      { id: 20, year: 2026, name: '2026-27 Season' },
      { id: 21, year: 2027, name: '2027-28 Season' },
      { id: 22, year: 2028, name: '2028-29 Season' },
      { id: 23, year: 2029, name: '2029-30 Season' },
      { id: 24, year: 2030, name: '2030-31 Season' },
    ]

    for (const season of futureSeasons) {
      console.log(`Adding ${season.name} (ID ${season.id})...`)
      
      const { error } = await supabase
        .from('seasons')
        .insert({
          id: season.id,
          year: season.year,
          name: season.name,
          is_active: false,
          is_active_assets: false
        })

      if (error) {
        if (error.code === '23505') {
          console.log(`  ⚠️  Season ${season.id} already exists`)
        } else {
          console.error(`  ❌ Error creating season ${season.id}:`, error)
        }
      } else {
        console.log(`  ✅ Created season ${season.id}`)
      }
    }

    console.log('\n🎉 Future seasons ready for admin testing!')

  } catch (error) {
    console.error('Error adding future seasons:', error)
  }
}

addFutureSeasons()