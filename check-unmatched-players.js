const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const unmatchedPlayers = [
  'Vince Williams Jr.',
  'Cameron Johnson',
  'Ron Holland II',
  'Jaren Jackson, Jr.',
  'Michael Porter, Jr.',
  'Reece Beekman',
  'Tim Hardaway Jr',
  'Sandro Mamukelashvii',
  'Jeff Dowtin Jr',
  'RJ Barrett'
];

async function checkPlayers() {
  console.log('Checking for similar player names...\n');
  
  for (const unmatchedName of unmatchedPlayers) {
    console.log(`Searching for: ${unmatchedName}`);
    
    // Search for players with similar names
    const { data: players, error } = await supabase
      .from('players')
      .select('id, name')
      .ilike('name', `%${unmatchedName.split(' ')[0]}%`);
    
    if (error) {
      console.error('Error:', error.message);
      continue;
    }
    
    if (players && players.length > 0) {
      console.log('  Similar matches found:');
      players.slice(0, 5).forEach(player => {
        console.log(`    - ${player.name} (ID: ${player.id})`);
      });
    } else {
      console.log('  No similar matches found');
    }
    console.log('');
  }
}

checkPlayers();