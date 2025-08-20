require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey || !supabaseUrl) {
  console.error('Supabase configuration not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLSLPlayerReferences() {
  console.log('Fixing LSL player references...');
  
  try {
    // Step 1: Get all LSL players
    console.log('1. Getting LSL players...');
    const { data: lslData, error: lslError } = await supabase
      .from('lsl')
      .select('*')
      .order('year', { ascending: true })
      .order('draft_order', { ascending: true });
      
    if (lslError) {
      console.error('Error fetching LSL data:', lslError);
      return;
    }
    
    console.log(`Found ${lslData.length} LSL records`);
    
    // Step 2: Get all existing players
    console.log('2. Getting existing players...');
    const { data: existingPlayers, error: playersError } = await supabase
      .from('players')
      .select('id, name');
      
    if (playersError) {
      console.error('Error fetching players:', playersError);
      return;
    }
    
    console.log(`Found ${existingPlayers.length} existing players`);
    
    // Step 3: Check which LSL players exist
    const existingPlayerNames = new Set(existingPlayers.map(p => p.name));
    const lslPlayerNames = [...new Set(lslData.map(r => r.player_name))];
    
    console.log('3. Checking LSL players against existing players...');
    const missingPlayers = [];
    const playerMatches = {};
    
    lslPlayerNames.forEach(lslPlayer => {
      const existingPlayer = existingPlayers.find(p => p.name === lslPlayer);
      if (existingPlayer) {
        playerMatches[lslPlayer] = existingPlayer.id;
        console.log(`✓ Found: ${lslPlayer} -> ID ${existingPlayer.id}`);
      } else {
        missingPlayers.push(lslPlayer);
        console.log(`✗ Missing: ${lslPlayer}`);
      }
    });
    
    console.log(`\nSummary: ${Object.keys(playerMatches).length} found, ${missingPlayers.length} missing`);
    
    // Step 4: Add missing players to players table
    if (missingPlayers.length > 0) {
      console.log('4. Adding missing players to players table...');
      
      const newPlayers = missingPlayers.map(playerName => ({
        name: playerName
      }));
      
      console.log('New players to add:');
      newPlayers.forEach(p => console.log(`- ${p.name}`));
      
      const { data: insertedPlayers, error: insertError } = await supabase
        .from('players')
        .insert(newPlayers)
        .select();
        
      if (insertError) {
        console.error('Error inserting new players:', insertError);
        return;
      }
      
      console.log(`Successfully added ${insertedPlayers.length} new players`);
      
      // Add new players to our mapping
      insertedPlayers.forEach(player => {
        playerMatches[player.name] = player.id;
      });
    }
    
    // Step 5: Show the complete player mapping
    console.log('\n5. Complete player mapping:');
    Object.entries(playerMatches).forEach(([name, id]) => {
      console.log(`${name} -> ID ${id}`);
    });
    
    // Save the mapping for the next step
    fs.writeFileSync('lsl-player-mapping.json', JSON.stringify(playerMatches, null, 2));
    console.log('\nPlayer mapping saved to lsl-player-mapping.json');
    
    return { lslData, playerMatches };
    
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

fixLSLPlayerReferences();