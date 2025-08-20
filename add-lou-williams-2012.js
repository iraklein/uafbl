require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey || !supabaseUrl) {
  console.error('Supabase configuration not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addLouWilliams2012() {
  console.log('Adding Lou Williams drafted by Luskey for $10 in 2012...');
  
  const draftRecord = {
    player_id: 202,   // Lou Williams BBM ID
    season_id: 7,     // 2012 season ID
    draft_price: 10,
    manager_id: 9,    // Luskey's manager ID
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
      console.log('Successfully added Lou Williams draft record:', data);
    }
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

addLouWilliams2012();