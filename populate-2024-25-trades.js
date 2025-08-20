const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// All the trades data from the user
const tradesData = [
  { name: "Lauri Markkanen", count: 4 },
  { name: "Marcus Smart", count: 3 },
  { name: "Jaylen Brown", count: 3 },
  { name: "DeAndre Ayton", count: 3 },
  { name: "Cameron Thomas", count: 3 },
  { name: "Mike Conley", count: 2 },
  { name: "Kyrie Irving", count: 2 },
  { name: "Jimmy Butler", count: 2 },
  { name: "Tobias Harris", count: 2 },
  { name: "Joel Embiid", count: 2 },
  { name: "D'Angelo Russell", count: 2 },
  { name: "Bam Adebayo", count: 2 },
  { name: "Luka Doncic", count: 2 },
  { name: "Jaden McDaniels", count: 2 },
  { name: "Malik Beasley", count: 2 },
  { name: "Anfernee Simons", count: 2 },
  { name: "Royce O'Neale", count: 2 },
  { name: "Payton Pritchard", count: 2 },
  { name: "Nicolas Claxton", count: 2 },
  { name: "Cason Wallace", count: 2 },
  { name: "Miles McBride", count: 2 },
  { name: "Stephon Castle", count: 2 },
  { name: "Stephen Curry", count: 1 },
  { name: "Lebron James", count: 1 },
  { name: "Kevin Durant", count: 1 },
  { name: "Chris Paul", count: 1 },
  { name: "James Harden", count: 1 },
  { name: "Anthony Davis", count: 1 },
  { name: "Klay Thompson", count: 1 },
  { name: "Paul George", count: 1 },
  { name: "Kawhi Leonard", count: 1 },
  { name: "Jonas Valanciunas", count: 1 },
  { name: "Bradley Beal", count: 1 },
  { name: "DeMar DeRozan", count: 1 },
  { name: "Rudy Gobert", count: 1 },
  { name: "Harrison Barnes", count: 1 },
  { name: "Dennis Schroeder", count: 1 },
  { name: "Zach LaVine", count: 1 },
  { name: "Spencer Dinwiddie", count: 1 },
  { name: "Myles Turner", count: 1 },
  { name: "Devin Booker", count: 1 },
  { name: "Norman Powell", count: 1 },
  { name: "Kris Dunn", count: 1 },
  { name: "Domantas Sabonis", count: 1 },
  { name: "De'Aaron Fox", count: 1 },
  { name: "Malik Monk", count: 1 },
  { name: "OG Anunoby", count: 1 },
  { name: "Michael Porter Jr.", count: 1 },
  { name: "Trae Young", count: 1 },
  { name: "Mikal Bridges", count: 1 },
  { name: "Bol Bol", count: 1 },
  { name: "Josh Hart", count: 1 },
  { name: "Fred VanVleet", count: 1 },
  { name: "Mitchell Robinson", count: 1 },
  { name: "Donte DiVincenzo", count: 1 },
  { name: "Derrick White", count: 1 },
  { name: "Ja Morant", count: 1 },
  { name: "Jalen Brunson", count: 1 },
  { name: "Darius Garland", count: 1 },
  { name: "Tyler Herro", count: 1 },
  { name: "De'andre Hunter", count: 1 },
  { name: "Jordan Poole", count: 1 },
  { name: "Duncan Robinson", count: 1 },
  { name: "Daniel Gafford", count: 1 },
  { name: "Jalen Smith", count: 1 },
  { name: "Naji Marshall", count: 1 },
  { name: "Alperen Sengun", count: 1 },
  { name: "Franz Wagner", count: 1 },
  { name: "Brandon Williams", count: 1 },
  { name: "Austin Reaves", count: 1 },
  { name: "Tre Jones", count: 1 },
  { name: "Alex Caruso", count: 1 },
  { name: "Jabari Smith Jr.", count: 1 },
  { name: "Keegan Murray", count: 1 },
  { name: "Bennedict Mathurin", count: 1 },
  { name: "Walker Kessler", count: 1 },
  { name: "Jalen Duren", count: 1 },
  { name: "Shaedon Sharpe", count: 1 },
  { name: "Dyson Daniels", count: 1 },
  { name: "Chet Holmgren", count: 1 },
  { name: "Jeremy Sochan", count: 1 },
  { name: "Day'Ron Sharpe", count: 1 },
  { name: "Jalen Johnson", count: 1 },
  { name: "Bilal Coulibaly", count: 1 },
  { name: "Dereck Lively II", count: 1 },
  { name: "Scoot Henderson", count: 1 },
  { name: "Anthony Black", count: 1 },
  { name: "Keyonte George", count: 1 },
  { name: "Gradey Dick", count: 1 },
  { name: "Amen Thompson", count: 1 },
  { name: "Jaime Jaquez Jr.", count: 1 },
  { name: "Noah Clowney", count: 1 },
  { name: "Scotty Pippen Jr.", count: 1 },
  { name: "Alex Sarr", count: 1 },
  { name: "Reed Sheppard", count: 1 },
  { name: "Ron Holland II", count: 1 },
  { name: "Rob Dillingham", count: 1 },
  { name: "Matas Buzelis", count: 1 },
  { name: "Devin Carter", count: 1 },
  { name: "Kel'el Ware", count: 1 },
  { name: "Jared McCain", count: 1 },
  { name: "Dalton Knecht", count: 1 },
  { name: "Kyshawn George", count: 1 },
  { name: "Ty Jerome", count: 1 },
  { name: "Jared Butler", count: 1 },
  { name: "Max Christie", count: 1 },
  { name: "Jamal Shead", count: 1 }
];

async function populateTrades() {
  try {
    console.log('Starting to populate trades for 2024-25 season...');

    // Get the 2024-25 season
    const { data: seasons } = await supabase
      .from('seasons')
      .select('id, name, year')
      .or('name.ilike.%2024-25%,year.eq.2024');
    
    const season2024_25 = seasons.find(s => s.name.includes('2024-25') || s.year === 2024);
    if (!season2024_25) {
      console.error('2024-25 season not found');
      return;
    }
    
    console.log(`Using season: ${season2024_25.name} (ID: ${season2024_25.id})`);

    // Get all players
    const { data: players } = await supabase.from('players').select('id, name');
    const playerMap = {};
    players.forEach(player => {
      playerMap[player.name.toLowerCase()] = player;
    });

    console.log(`Found ${players.length} players in database`);

    // Prepare all trade records
    const tradeRecords = [];
    const unmatchedPlayers = [];

    for (const trade of tradesData) {
      // Try to find the player with exact name match first
      let player = playerMap[trade.name.toLowerCase()];
      
      // If not found, try some common variations
      if (!player) {
        const variations = [
          trade.name.replace(/Jr\.$/, 'Jr.'),
          trade.name.replace(/Jr\.$/, ', Jr.'),
          trade.name.replace(/,\s*Jr\.$/, 'Jr.'),
          trade.name.replace(/Michael Porter, Jr\./, 'Michael Porter Jr.'),
          trade.name.replace(/Jabari Smith$/, 'Jabari Smith Jr.'),
          // LeBron vs Lebron
          trade.name.replace(/Lebron/, 'LeBron'),
          // Try without Jr. suffix
          trade.name.replace(/\s+Jr\.$/, ''),
          trade.name.replace(/\s+Jr\.$/, ' Jr'),
          // Alexandre vs Alex
          trade.name.replace(/Alex Sarr/, 'Alexandre Sarr')
        ];
        
        for (const variation of variations) {
          player = playerMap[variation.toLowerCase()];
          if (player) {
            console.log(`Found with variation: "${trade.name}" -> "${variation}"`);
            break;
          }
        }
      }

      if (player) {
        // Add the specified number of trade records for this player
        for (let i = 0; i < trade.count; i++) {
          tradeRecords.push({
            season_id: season2024_25.id,
            player_id: player.id,
            notes: `Trade ${i + 1} of ${trade.count}`
          });
        }
        console.log(`✓ ${trade.name} - ${trade.count} trades`);
      } else {
        unmatchedPlayers.push(trade.name);
        console.log(`✗ ${trade.name} - not found`);
      }
    }

    console.log(`\nPrepared ${tradeRecords.length} trade records`);
    
    if (unmatchedPlayers.length > 0) {
      console.log(`\nUnmatched players (${unmatchedPlayers.length}):`)
      unmatchedPlayers.forEach(name => console.log(`  ${name}`));
    }

    // Insert trades in batches
    if (tradeRecords.length > 0) {
      console.log('\nInserting trades into database...');
      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < tradeRecords.length; i += batchSize) {
        const batch = tradeRecords.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('trades')
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError.message);
        } else {
          insertedCount += batch.length;
          console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
        }
      }

      console.log(`\nCompleted! Inserted ${insertedCount} of ${tradeRecords.length} trade records`);
    }

    // Show final summary
    const { data: finalTrades } = await supabase
      .from('trades')
      .select('id')
      .eq('season_id', season2024_25.id);

    console.log(`\nTotal trades in 2024-25 season: ${finalTrades ? finalTrades.length : 0}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

populateTrades();