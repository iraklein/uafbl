require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey || !supabaseUrl) {
  console.error('Supabase configuration not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix2020DraftSimple() {
  console.log('Making 2020 draft corrections...');
  
  try {
    const corrections = [];
    
    // 1. Fix Christian Wood: Remove from Luskey ($41), Add to Jones ($10 keeper)
    console.log('1. Fixing Christian Wood...');
    const { error: deleteChristian } = await supabase
      .from('draft_results')
      .delete()
      .eq('player_id', 5145)  // Christian Wood
      .eq('season_id', 15)    // 2020
      .eq('manager_id', 9);   // Luskey
    
    if (deleteChristian) console.log('Error deleting Christian Wood from Luskey:', deleteChristian);
    else console.log('Removed Christian Wood from Luskey');
    
    // Add Christian Wood to Jones
    corrections.push({
      player_id: 5145,  // Christian Wood
      season_id: 15,    // 2020
      draft_price: 10,
      manager_id: 8,    // Jones
      is_keeper: true
    });
    
    // 2. Kevin Porter is already correct (Luskey, $3) - found in existing records
    console.log('2. Kevin Porter already correct in records');
    
    // 3. Add Derrick Rose to Luskey for $1 (need to find/create player first)
    // 4. Add John Wall to Glaspie for $21 as keeper (need to find/create player first)
    
    // For now, let's just handle Christian Wood and see what happens
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
    
    console.log('\nNote: Derrick Rose and John Wall need to be added to players table first');
    console.log('Or we need to find their correct player IDs');
    
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

fix2020DraftSimple();