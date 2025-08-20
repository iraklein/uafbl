const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findMissing2024Players() {
  try {
    console.log('Finding missing 2024 players...\n');

    // Get all existing players
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('bbm_id, name');

    const existingPlayerIds = new Set(existingPlayers.map(p => p.bbm_id));

    // Load our extracted 2024 data
    const rawData = JSON.parse(fs.readFileSync('draft-results-with-season-id.json', 'utf8'));
    const raw2024 = rawData.filter(r => r.season_year === 2024);

    console.log(`Checking ${raw2024.length} extracted 2024 records...`);

    // Find players that don't exist in our players table
    const missingPlayers = [];
    const missingPlayerNames = new Set();

    raw2024.forEach(record => {
      if (!existingPlayerIds.has(record.player_id)) {
        if (!missingPlayerNames.has(record.player_name)) {
          missingPlayers.push({
            bbm_id: record.player_id,
            name: record.player_name
          });
          missingPlayerNames.add(record.player_name);
        }
      }
    });

    console.log(`Found ${missingPlayers.length} missing players for 2024:`);
    missingPlayers.forEach((player, index) => {
      console.log(`${index + 1}. ${player.name} (ID: ${player.bbm_id})`);
    });

    if (missingPlayers.length > 0) {
      // Save missing players
      fs.writeFileSync('missing-2024-players.json', JSON.stringify(missingPlayers, null, 2));
      console.log('\nMissing players saved to missing-2024-players.json');

      // Add them to players table
      console.log('\nAdding missing players...');
      const { data, error } = await supabase
        .from('players')
        .insert(missingPlayers);

      if (error) {
        console.error('Error adding missing players:', error);
      } else {
        console.log(`✅ Successfully added ${missingPlayers.length} missing players`);
      }
    }

    // Now let's re-attempt the 2024 draft data insertion
    console.log('\nRe-attempting 2024 draft data insertion...');
    
    const season2024Id = 19; // We know this from previous debug
    const clean2024Data = raw2024
      .filter(record => record.manager_id && record.season_id)
      .map(record => ({
        player_id: record.player_id,
        season_id: record.season_id,
        draft_price: record.draft_price,
        manager_id: record.manager_id,
        is_keeper: record.is_keeper
      }));

    console.log(`Attempting to insert ${clean2024Data.length} 2024 records...`);

    // Insert in smaller batches to better handle errors
    const batchSize = 20;
    let inserted = 0;
    let errors = [];

    for (let i = 0; i < clean2024Data.length; i += batchSize) {
      const batch = clean2024Data.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('draft_results')
        .insert(batch);

      if (error) {
        console.log(`Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
        errors.push(error.message);
      } else {
        inserted += batch.length;
      }
    }

    console.log(`\nInsertion summary:`);
    console.log(`Successfully inserted: ${inserted}`);
    console.log(`Errors: ${errors.length}`);

    // Check final count
    const { count: finalCount } = await supabase
      .from('draft_results')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', season2024Id);

    console.log(`\nFinal 2024 records in database: ${finalCount}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

findMissing2024Players();