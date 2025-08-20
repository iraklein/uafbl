const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPlayersTable() {
  try {
    // First, let's check if the players table exists and see its structure
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .limit(10);

    if (error) {
      console.log('Error accessing players table:', error.message);
      return;
    }

    console.log('Players table structure:');
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
      console.log('Sample data:');
      data.forEach((player, index) => {
        console.log(`${index + 1}:`, player);
      });
    } else {
      console.log('Players table is empty or has no data');
    }

    // Count total players in the table
    const { count, error: countError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`Total players in Supabase: ${count}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkPlayersTable();