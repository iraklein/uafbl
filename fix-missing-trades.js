const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixMissingTrades() {
  try {
    console.log('Adding properly matched trades...');

    // Get the 2024-25 season
    const { data: seasons } = await supabase
      .from('seasons')
      .select('id, name, year')
      .or('name.ilike.%2024-25%,year.eq.2024');
    
    const season2024_25 = seasons.find(s => s.name.includes('2024-25') || s.year === 2024);

    // Manually find each player and add their trades
    const tradesToAdd = [
      { searchName: 'Cameron Thomas', count: 3 },
      { searchName: 'O.G. Anunoby', count: 1 }, 
      { searchName: 'Michael Porter, Jr.', count: 1 },
      { searchName: 'Jabari Smith', count: 1 }, // Either version should work
      { searchName: 'Ron Holland', count: 1 }
    ];

    // Find remaining players by searching database
    for (const trade of tradesToAdd) {
      console.log(`\nSearching for: ${trade.searchName}`);
      
      const { data: players } = await supabase
        .from('players')
        .select('id, name')
        .ilike('name', `%${trade.searchName.split(' ')[0]}%`);
      
      console.log('Found players:', players?.map(p => p.name));
      
      // Find best match
      let bestMatch = null;
      if (trade.searchName === 'Cameron Thomas') {
        bestMatch = players?.find(p => p.name === 'Cameron Thomas');
      } else if (trade.searchName === 'O.G. Anunoby') {
        bestMatch = players?.find(p => p.name === 'O.G. Anunoby');
      } else if (trade.searchName === 'Michael Porter, Jr.') {
        bestMatch = players?.find(p => p.name.includes('Michael Porter'));
      } else if (trade.searchName === 'Jabari Smith') {
        bestMatch = players?.find(p => p.name === 'Jabari Smith');
      } else if (trade.searchName === 'Ron Holland') {
        bestMatch = players?.find(p => p.name === 'Ron Holland');
      }
      
      if (bestMatch) {
        console.log(`Selected: ${bestMatch.name}`);
        
        // Add trades for this player
        const tradeRecords = [];
        for (let i = 0; i < trade.count; i++) {
          tradeRecords.push({
            season_id: season2024_25.id,
            player_id: bestMatch.id,
            notes: `Trade ${i + 1} of ${trade.count}`
          });
        }
        
        const { error } = await supabase
          .from('trades')
          .insert(tradeRecords);

        if (error) {
          console.error(`Error adding trades for ${bestMatch.name}:`, error.message);
        } else {
          console.log(`✓ Added ${trade.count} trades for ${bestMatch.name}`);
        }
      } else {
        console.log(`✗ No match found for ${trade.searchName}`);
      }
    }

    // Final count
    const { data: finalTrades } = await supabase
      .from('trades')
      .select('id')
      .eq('season_id', season2024_25.id);

    console.log(`\nFinal total trades in 2024-25 season: ${finalTrades ? finalTrades.length : 0}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixMissingTrades();