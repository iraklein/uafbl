const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findMissingPlayers() {
  try {
    console.log('Finding missing players in draft data...');
    
    // Get all existing players from Supabase
    const { data: existingPlayers, error: playersError } = await supabase
      .from('players')
      .select('bbm_id, name');

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return;
    }

    console.log(`Found ${existingPlayers.length} existing players in Supabase`);

    // Create a set of existing player IDs
    const existingPlayerIds = new Set(existingPlayers.map(p => p.bbm_id));

    // Load draft data to find which player_ids are referenced
    const draftData = JSON.parse(fs.readFileSync('draft-results-with-season-id.json', 'utf8'));
    
    // Find all unique player_ids in draft data
    const draftPlayerIds = new Set();
    const draftPlayerNames = new Map(); // player_id -> name
    
    draftData.forEach(record => {
      if (record.player_id && record.player_name) {
        draftPlayerIds.add(record.player_id);
        draftPlayerNames.set(record.player_id, record.player_name);
      }
    });

    console.log(`Found ${draftPlayerIds.size} unique players referenced in draft data`);

    // Find missing players
    const missingPlayerIds = [];
    draftPlayerIds.forEach(playerId => {
      if (!existingPlayerIds.has(playerId)) {
        missingPlayerIds.push({
          bbm_id: playerId,
          name: draftPlayerNames.get(playerId)
        });
      }
    });

    console.log(`Found ${missingPlayerIds.length} missing players`);

    if (missingPlayerIds.length > 0) {
      console.log('\nMissing players (first 20):');
      missingPlayerIds.slice(0, 20).forEach((player, index) => {
        console.log(`${index + 1}. ID: ${player.bbm_id}, Name: ${player.name}`);
      });

      // Save missing players for review
      fs.writeFileSync('missing-players.json', JSON.stringify(missingPlayerIds, null, 2));
      console.log(`\nAll ${missingPlayerIds.length} missing players saved to missing-players.json`);

      // Ask if we should add them
      console.log('\nWould you like to add these missing players to the players table?');
      console.log('Run: node add-missing-players.js confirm');
      
      return missingPlayerIds;
    } else {
      console.log('No missing players found!');
      return [];
    }

  } catch (error) {
    console.error('Error finding missing players:', error);
  }
}

findMissingPlayers();