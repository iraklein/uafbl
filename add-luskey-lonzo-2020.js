require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey || !supabaseUrl) {
  console.error('Supabase configuration not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addLuskeyLonzoDraft() {
  console.log('Adding Luskey drafting Lonzo Ball for $41 in 2020...');
  
  const draftRecord = {
    player_id: 5449, // Lonzo Ball's ID
    season_id: 15,   // 2020 season ID
    draft_price: 41,
    manager_id: 9,   // Luskey's manager ID
    is_keeper: false
  };
  
  try {
    const { data, error } = await supabase
      .from('draft_results')
      .insert([draftRecord])
      .select();
    
    if (error) {
      console.error('Error inserting draft record:', error);
    } else {
      console.log('Successfully added draft record:', data);
    }
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

addLuskeyLonzoDraft();