const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSeasons() {
  try {
    const { data: seasons, error } = await supabase
      .from('seasons')
      .select('*')
      .order('year');

    if (error) {
      console.error('Error fetching seasons:', error);
      return;
    }

    console.log('Seasons table:');
    seasons.forEach(season => {
      console.log(`ID: ${season.id}, Year: ${season.year}, Name: ${season.name}, Active: ${season.is_active}`);
    });

    console.log(`\nTotal seasons: ${seasons.length}`);

    // Save for reference
    const fs = require('fs');
    fs.writeFileSync('seasons-list.json', JSON.stringify(seasons, null, 2));
    console.log('Seasons saved to seasons-list.json');

    // Create mapping for draft data
    const seasonYearToIdMap = {};
    seasons.forEach(season => {
      seasonYearToIdMap[season.year] = season.id;
    });

    fs.writeFileSync('season-mapping.json', JSON.stringify(seasonYearToIdMap, null, 2));
    console.log('Season year-to-ID mapping saved to season-mapping.json');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkSeasons();