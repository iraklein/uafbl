const XLSX = require('xlsx');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix2023Data() {
  try {
    console.log('Fixing 2023 draft data with correct column structure...\n');

    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    const sheet = workbook.Sheets['2023 Draft Sheet'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`2023 Draft Sheet has ${data.length} rows`);

    // Load mappings
    const { data: seasons } = await supabase.from('seasons').select('*');
    const season2023Id = seasons.find(s => s.year === 2023)?.id;

    const managers = JSON.parse(fs.readFileSync('managers-list.json', 'utf8'));
    const managerMap = {};
    managers.forEach(manager => { managerMap[manager.manager_name] = manager.id; });

    let allPlayers = [];
    let offset = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data: batch } = await supabase
        .from('players')
        .select('bbm_id, name')
        .range(offset, offset + batchSize - 1);
      
      if (!batch || batch.length === 0) break;
      allPlayers.push(...batch);
      if (batch.length < batchSize) break;
      offset += batchSize;
    }
    
    console.log(`Loaded ${allPlayers.length} total players`);
    const playerNameToId = new Map();
    allPlayers.forEach(player => { playerNameToId.set(player.name.toLowerCase(), player.bbm_id); });

    // Name mappings
    const nameMap = {
      'Karl Anthony Towns': 'Karl-Anthony Towns',
      'Alex Sarr': 'Alexandre Sarr',
      'Jaren Jackson, Jr.': 'Jaren Jackson Jr.',
      'Jabari Smith': 'Jabari Smith Jr.',
      'Michael Porter, Jr.': 'Michael Porter Jr.',
      'Cameron Thomas': 'Cam Thomas',
      'Bogdan Bogdanovich': 'Bogdan Bogdanovic',
      'Gary Trent, Jr.': 'Gary Trent',
      'Herbert Jones': 'Herb Jones',
      'Cameron Johnson': 'Cam Johnson',
      'Ron Holland II': 'Ron Holland',
      'Kevin Porter': 'Kevin Porter Jr.',
      'Colin Sexton': 'Collin Sexton',
      'OG Anunoby': 'O.G. Anunoby',
      'CJ McCollum': 'C.J. McCollum',
      'RJ Barrett': 'R.J. Barrett',
      'Terrance Mann': 'Terance Mann',
      'Wendall Carter, Jr.': 'Wendell Carter Jr.',
      'JJ Redick': 'J.J. Redick',
      'TJ Warren': 'T.J. Warren',
      'PJ Tucker': 'P.J. Tucker',
      'CJ Miles': 'C.J. Miles',
      'JR Smith': 'J.R. Smith',
      'Talen Horton-Tucker': 'Talen Horton-Tucker'
    };

    // 2023 format: Player=0, Keeper Cost=1, Price=2, Team=3, Keeper Years=4, Notes=5
    const playerCol = 0;
    const priceCol = 2;
    const teamCol = 3;
    const keeperYearsCol = 4;

    console.log(`Using columns - Player: ${playerCol}, Price: ${priceCol}, Team: ${teamCol}, Keeper Years: ${keeperYearsCol}`);

    const seasonRecords = [];
    const unmatchedRecords = [];

    for (let i = 2; i < data.length; i++) { // Start from row 2 (data starts there)
      const row = data[i];
      let playerName = row[playerCol];
      const price = row[priceCol];
      const teamName = row[teamCol];
      const keeperYears = row[keeperYearsCol];

      if (!playerName || !teamName) continue;

      // Clean up names
      playerName = playerName.toString().trim();
      
      // Apply name mapping
      const mappedName = nameMap[playerName] || playerName;
      const playerId = playerNameToId.get(mappedName.toLowerCase());
      const managerId = managerMap[teamName];

      if (playerId && managerId) {
        seasonRecords.push({
          player_id: playerId,
          season_id: season2023Id,
          draft_price: price || null,
          manager_id: managerId,
          is_keeper: keeperYears ? true : false
        });
      } else {
        unmatchedRecords.push({
          original: playerName,
          mapped: mappedName,
          team: teamName,
          hasPlayer: !!playerId,
          hasManager: !!managerId,
          price
        });
      }
    }

    console.log(`\nExtracted ${seasonRecords.length} valid records, ${unmatchedRecords.length} unmatched`);

    if (unmatchedRecords.length > 0) {
      console.log('\nFirst 10 unmatched records:');
      unmatchedRecords.slice(0, 10).forEach((record, index) => {
        console.log(`${index + 1}. ${record.original} -> ${record.team} ($${record.price}) [Player: ${record.hasPlayer}, Manager: ${record.hasManager}]`);
      });
    }

    // Clear existing 2023 data and insert new complete data
    if (seasonRecords.length > 0) {
      console.log('\nClearing existing 2023 data...');
      const { error: deleteError } = await supabase
        .from('draft_results')
        .delete()
        .eq('season_id', season2023Id);

      if (deleteError) {
        console.error('Error clearing 2023 data:', deleteError.message);
        return;
      }

      console.log(`Inserting ${seasonRecords.length} records for 2023...`);
      const { error: insertError } = await supabase
        .from('draft_results')
        .insert(seasonRecords);

      if (insertError) {
        console.error('Error inserting 2023 records:', insertError.message);
      } else {
        console.log(`✅ Successfully inserted ${seasonRecords.length} records for 2023`);
      }

      // Final count
      const { count: finalCount } = await supabase
        .from('draft_results')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', season2023Id);

      console.log(`\nFinal 2023 records in database: ${finalCount}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

console.log('This will fix the 2023 draft data extraction.');
console.log('Run with: node fix-2023-data.js confirm');

if (process.argv[2] === 'confirm') {
  fix2023Data();
} else {
  console.log('Add "confirm" as an argument to proceed.');
}