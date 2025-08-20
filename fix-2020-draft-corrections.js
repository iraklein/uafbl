require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey || !supabaseUrl) {
  console.error('Supabase configuration not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix2020DraftCorrections() {
  console.log('Fixing 2020 draft records...');
  
  try {
    // First, let's get the player IDs we need
    const playersToCheck = ['Christian Wood', 'Kevin Porter', 'Derrick Rose', 'John Wall'];
    const { data: players } = await supabase
      .from('players')
      .select('bbm_id, name')
      .in('name', playersToCheck);
    
    console.log('Found players:', players);
    
    const playerMap = {};
    players.forEach(player => {
      playerMap[player.name] = player.bbm_id;
    });
    
    // Get current 2020 draft records for these players
    const { data: currentRecords } = await supabase
      .from('draft_results')
      .select('*')
      .eq('season_id', 15) // 2020 season
      .in('player_id', Object.values(playerMap));
      
    console.log('Current 2020 records for these players:', currentRecords);
    
    // Manager IDs: Luskey=9, Jones=8, Glaspie=17
    const corrections = [];
    
    // 1. Remove Christian Wood from Luskey, add to Jones for $10 as keeper
    const christianWoodId = playerMap['Christian Wood'];
    if (christianWoodId) {
      // Delete incorrect record if exists
      await supabase
        .from('draft_results')
        .delete()
        .eq('player_id', christianWoodId)
        .eq('season_id', 15)
        .eq('manager_id', 9); // Luskey
      
      // Add correct record for Jones
      corrections.push({
        player_id: christianWoodId,
        season_id: 15,
        draft_price: 10,
        manager_id: 8, // Jones
        is_keeper: true
      });
    }
    
    // 2. Add Kevin Porter to Luskey for $3
    const kevinPorterId = playerMap['Kevin Porter'];
    if (kevinPorterId) {
      corrections.push({
        player_id: kevinPorterId,
        season_id: 15,
        draft_price: 3,
        manager_id: 9, // Luskey
        is_keeper: false
      });
    }
    
    // 3. Add Derrick Rose to Luskey for $1
    const derrickRoseId = playerMap['Derrick Rose'];
    if (derrickRoseId) {
      corrections.push({
        player_id: derrickRoseId,
        season_id: 15,
        draft_price: 1,
        manager_id: 9, // Luskey
        is_keeper: false
      });
    }
    
    // 4. Remove John Wall from Luskey, add to Glaspie for $21 as keeper
    const johnWallId = playerMap['John Wall'];
    if (johnWallId) {
      // Delete incorrect record if exists
      await supabase
        .from('draft_results')
        .delete()
        .eq('player_id', johnWallId)
        .eq('season_id', 15)
        .eq('manager_id', 9); // Luskey
      
      // Add correct record for Glaspie
      corrections.push({
        player_id: johnWallId,
        season_id: 15,
        draft_price: 21,
        manager_id: 17, // Glaspie
        is_keeper: true
      });
    }
    
    // Insert all corrections
    if (corrections.length > 0) {
      const { data, error } = await supabase
        .from('draft_results')
        .insert(corrections)
        .select();
      
      if (error) {
        console.error('Error inserting corrections:', error);
      } else {
        console.log('Successfully added corrections:', data);
      }
    }
    
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

fix2020DraftCorrections();