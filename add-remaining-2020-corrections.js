require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey || !supabaseUrl) {
  console.error('Supabase configuration not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addRemaining2020Corrections() {
  console.log('Adding remaining 2020 draft corrections...');
  
  try {
    const corrections = [];
    
    // Add Derrick Rose to Luskey for $1 (BBM ID: 12)
    console.log('1. Adding Derrick Rose to Luskey...');
    corrections.push({
      player_id: 12,    // Derrick Rose
      season_id: 15,    // 2020
      draft_price: 1,
      manager_id: 9,    // Luskey
      is_keeper: false
    });
    
    // Check if John Wall was incorrectly assigned to Luskey first
    console.log('2. Checking for incorrect John Wall assignment to Luskey...');
    const { data: johnWallRecords } = await supabase
      .from('draft_results')
      .select('*')
      .eq('player_id', 1)  // John Wall BBM ID
      .eq('season_id', 15) // 2020
      .eq('manager_id', 9); // Luskey
    
    if (johnWallRecords && johnWallRecords.length > 0) {
      console.log('Found John Wall record with Luskey, deleting...');
      const { error: deleteJohn } = await supabase
        .from('draft_results')
        .delete()
        .eq('player_id', 1)   // John Wall
        .eq('season_id', 15)  // 2020
        .eq('manager_id', 9); // Luskey
      
      if (deleteJohn) console.log('Error deleting John Wall from Luskey:', deleteJohn);
      else console.log('Removed John Wall from Luskey');
    } else {
      console.log('No John Wall record found with Luskey');
    }
    
    // Add John Wall to Glaspie for $21 as keeper
    console.log('3. Adding John Wall to Glaspie...');
    corrections.push({
      player_id: 1,     // John Wall
      season_id: 15,    // 2020
      draft_price: 21,
      manager_id: 17,   // Glaspie
      is_keeper: true
    });
    
    // Insert all corrections
    if (corrections.length > 0) {
      const { data, error } = await supabase
        .from('draft_results')
        .insert(corrections)
        .select();
      
      if (error) {
        console.error('Error inserting corrections:', error);
      } else {
        console.log('Successfully added corrections:');
        data.forEach(record => {
          const playerName = record.player_id === 12 ? 'Derrick Rose' : 'John Wall';
          const managerName = record.manager_id === 9 ? 'Luskey' : 'Glaspie';
          console.log(`- ${playerName} to ${managerName} for $${record.draft_price}${record.is_keeper ? ' (keeper)' : ''}`);
        });
      }
    }
    
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

addRemaining2020Corrections();