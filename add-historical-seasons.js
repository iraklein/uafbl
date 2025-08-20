const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addHistoricalSeasons() {
  try {
    console.log('Adding historical seasons (2007-2024)...');

    // Generate seasons from 2007 to 2024
    const seasonsToAdd = [];
    for (let year = 2007; year <= 2024; year++) {
      seasonsToAdd.push({
        year: year,
        name: `${year}-${(year + 1).toString().slice(-2)} Season`,
        is_active: false // Historical seasons are inactive
      });
    }

    console.log(`Preparing to add ${seasonsToAdd.length} historical seasons...`);

    // Insert in one batch
    const { data, error } = await supabase
      .from('seasons')
      .insert(seasonsToAdd)
      .select();

    if (error) {
      console.error('Error inserting seasons:', error);
      return;
    }

    console.log(`✅ Successfully added ${data.length} historical seasons`);

    // Get all seasons now
    const { data: allSeasons, error: fetchError } = await supabase
      .from('seasons')
      .select('*')
      .order('year');

    if (!fetchError) {
      console.log('\nAll seasons now in database:');
      allSeasons.forEach(season => {
        console.log(`ID: ${season.id}, Year: ${season.year}, Name: ${season.name}, Active: ${season.is_active}`);
      });

      // Save updated mappings
      const fs = require('fs');
      fs.writeFileSync('seasons-list.json', JSON.stringify(allSeasons, null, 2));
      
      const seasonYearToIdMap = {};
      allSeasons.forEach(season => {
        seasonYearToIdMap[season.year] = season.id;
      });
      fs.writeFileSync('season-mapping.json', JSON.stringify(seasonYearToIdMap, null, 2));
      
      console.log('\nUpdated season mappings saved');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

addHistoricalSeasons();