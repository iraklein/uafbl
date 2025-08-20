require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey || !supabaseUrl) {
  console.error('Supabase configuration not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateMissingLSLPlayers() {
  console.log('Updating remaining LSL records with player_id values...');
  
  // These are the players we just added with known IDs
  const newPlayerMapping = {
    'DeAndre Ayton': 7385,
    'Michael Porter, Jr.': 7386,
    'Frankie Ntilinka': 7387,
    'Trevon Duval': 7388,
    'Jaren Jackson, Jr.': 7389,
    'Wendall Carter, Jr.': 7390,
    'RJ Barrett': 7391,
    'Bol Bol': 7392,
    'Kevin Knox': 7393,
    'Cameron Reddish': 7394,
    'Charles Bassey': 7395,
    'Vernon Carey, Jr.': 7396,
    'Colin Sexton': 7397,
    'Sekou Doumbouya': 7398,
    'Emoni Bates': 7399,
    'Lebron James Jr': 7400,
    'RJ Hampton': 7401,
    'Patrick Baldwin, Jr.': 7402
  };
  
  try {
    let successCount = 0;
    let errorCount = 0;
    
    for (const [playerName, playerId] of Object.entries(newPlayerMapping)) {
      console.log(`Updating ${playerName} -> player_id ${playerId}`);
      
      const { error: updateError } = await supabase
        .from('lsl')
        .update({ player_id: playerId })
        .eq('player_name', playerName);
        
      if (updateError) {
        console.error(`❌ Error updating ${playerName}:`, updateError);
        errorCount++;
      } else {
        console.log(`✅ Updated: ${playerName} -> player_id ${playerId}`);
        successCount++;
      }
    }
    
    console.log(`\nFinal Update Summary:`);
    console.log(`✅ Successfully updated: ${successCount} records`);
    console.log(`❌ Errors: ${errorCount} records`);
    
    // Verify all LSL records now have player_id
    console.log('\nFinal verification...');
    const { data: allRecords, error: verifyError } = await supabase
      .from('lsl')
      .select('player_name, player_id')
      .is('player_id', null);
      
    if (verifyError) {
      console.error('Error verifying:', verifyError);
    } else {
      console.log(`Records still missing player_id: ${allRecords.length}`);
      if (allRecords.length > 0) {
        allRecords.forEach(record => {
          console.log(`Missing: ${record.player_name}`);
        });
      } else {
        console.log('🎉 All LSL records now have player_id!');
      }
    }
    
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

updateMissingLSLPlayers();