const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Missing trades with correct names
const missingTrades = [
  { name: "Cameron Thomas", dbName: "Cameron Thomas", count: 3 }, // Found this one
  { name: "OG Anunoby", dbName: "O.G. Anunoby", count: 1 },
  { name: "Michael Porter Jr.", dbName: "Michael Porter, Jr.", count: 1 },
  { name: "Jabari Smith Jr.", dbName: "Jabari Smith", count: 1 },
  { name: "Dereck Lively II", dbName: "Dereck Lively II", count: 1 }, // Try exact
  { name: "Jaime Jaquez Jr.", dbName: "Jaime Jaquez Jr.", count: 1 }, // Try exact
  { name: "Scotty Pippen Jr.", dbName: "Scotty Pippen Jr.", count: 1 }, // Try exact  
  { name: "Ron Holland II", dbName: "Ron Holland II", count: 1 } // Try exact
];

async function addMissingTrades() {
  try {
    console.log('Adding missing trades...');

    // Get the 2024-25 season
    const { data: seasons } = await supabase
      .from('seasons')
      .select('id, name, year')
      .or('name.ilike.%2024-25%,year.eq.2024');
    
    const season2024_25 = seasons.find(s => s.name.includes('2024-25') || s.year === 2024);

    // Get all players
    const { data: players } = await supabase.from('players').select('id, name');
    const playerMap = {};
    players.forEach(player => {
      playerMap[player.name.toLowerCase()] = player;
    });

    const tradeRecords = [];
    
    for (const trade of missingTrades) {
      let player = playerMap[trade.dbName.toLowerCase()];
      
      if (!player) {
        // Try some variations for the remaining ones
        const variations = [
          trade.dbName.replace('II', '2'),
          trade.dbName.replace('Jr.', 'Jr'),
          trade.dbName.replace('Jr.', ', Jr.'),
          'Dereck Lively',
          'Jaime Jaquez',
          'Scotty Pippen',
          'Ron Holland'
        ];
        
        for (const variation of variations) {
          player = playerMap[variation.toLowerCase()];
          if (player) {
            console.log(`Found with variation: "${trade.dbName}" -> "${variation}"`);
            break;
          }
        }
      }

      if (player) {
        for (let i = 0; i < trade.count; i++) {
          tradeRecords.push({
            season_id: season2024_25.id,
            player_id: player.id,
            notes: `Trade ${i + 1} of ${trade.count}`
          });
        }
        console.log(`✓ ${trade.name} -> ${player.name} - ${trade.count} trades`);
      } else {
        console.log(`✗ ${trade.name} (${trade.dbName}) - still not found`);
      }
    }

    if (tradeRecords.length > 0) {
      console.log(`\nInserting ${tradeRecords.length} missing trades...`);
      const { error } = await supabase
        .from('trades')
        .insert(tradeRecords);

      if (error) {
        console.error('Error inserting trades:', error.message);
      } else {
        console.log(`Successfully inserted ${tradeRecords.length} trades`);
      }
    }

    // Final count
    const { data: finalTrades } = await supabase
      .from('trades')
      .select('id')
      .eq('season_id', season2024_25.id);

    console.log(`\nTotal trades in 2024-25 season: ${finalTrades ? finalTrades.length : 0}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

addMissingTrades();