require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey || !supabaseUrl) {
  console.error('Supabase configuration not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLSLPlayerIds() {
  console.log('Updating LSL records with player_id values...');
  
  try {
    // Step 1: Get all LSL records
    const { data: lslRecords, error: lslError } = await supabase
      .from('lsl')
      .select('id, player_name')
      .order('id');
      
    if (lslError) {
      console.error('Error fetching LSL records:', lslError);
      return;
    }
    
    console.log(`Found ${lslRecords.length} LSL records to update`);
    
    // Step 2: Get all players to create name -> id mapping
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name');
      
    if (playersError) {
      console.error('Error fetching players:', playersError);
      return;
    }
    
    // Create name -> id mapping
    const playerMap = {};
    players.forEach(player => {
      playerMap[player.name] = player.id;
    });
    
    console.log(`Created mapping for ${Object.keys(playerMap).length} players`);
    
    // Step 3: Update each LSL record
    let successCount = 0;
    let errorCount = 0;
    
    for (const lslRecord of lslRecords) {
      const playerId = playerMap[lslRecord.player_name];
      
      if (!playerId) {
        console.error(`❌ No player ID found for: ${lslRecord.player_name}`);
        errorCount++;
        continue;
      }
      
      const { error: updateError } = await supabase
        .from('lsl')
        .update({ player_id: playerId })
        .eq('id', lslRecord.id);
        
      if (updateError) {
        console.error(`❌ Error updating ${lslRecord.player_name}:`, updateError);
        errorCount++;
      } else {
        console.log(`✅ Updated: ${lslRecord.player_name} -> player_id ${playerId}`);
        successCount++;
      }
    }
    
    console.log(`\nUpdate Summary:`);
    console.log(`✅ Successfully updated: ${successCount} records`);
    console.log(`❌ Errors: ${errorCount} records`);
    
    // Step 4: Verify the updates
    console.log('\nVerifying updates...');
    const { data: updatedRecords, error: verifyError } = await supabase
      .from('lsl')
      .select('id, player_name, player_id')
      .order('year', { ascending: true })
      .order('draft_order', { ascending: true })
      .limit(5);
      
    if (verifyError) {
      console.error('Error verifying updates:', verifyError);
    } else {
      console.log('\nSample updated records:');
      updatedRecords.forEach(record => {
        console.log(`${record.player_name} -> player_id: ${record.player_id}`);
      });
    }
    
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

updateLSLPlayerIds();