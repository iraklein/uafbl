const XLSX = require('xlsx');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function processAllDraftSheets() {
  try {
    console.log('Processing all draft sheets to complete UAFBL database...\n');

    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    
    // Find all draft sheets
    const draftSheets = workbook.SheetNames.filter(name => 
      /^\d{4}\s+Draft\s+Sheet$/.test(name)
    ).sort(); // Process in chronological order

    // Load season and manager mappings
    const { data: seasons } = await supabase.from('seasons').select('*');
    const seasonYearToId = {};
    seasons.forEach(season => { seasonYearToId[season.year] = season.id; });

    const managers = JSON.parse(fs.readFileSync('managers-list.json', 'utf8'));
    const managerMap = {};
    managers.forEach(manager => { managerMap[manager.manager_name] = manager.id; });

    // Get all players for name matching
    const { data: allPlayers } = await supabase.from('players').select('bbm_id, name');
    const playerNameToId = new Map();
    allPlayers.forEach(player => { playerNameToId.set(player.name.toLowerCase(), player.bbm_id); });

    // Common name mappings that apply across seasons
    const commonNameMappings = {
      'Karl Anthony Towns': 'Karl-Anthony Towns',
      'Karl-Anthony Towns': 'Karl-Anthony Towns',
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
      'DeAndre Jordan': 'DeAndre Jordan',
      'CJ Miles': 'C.J. Miles',
      'JJ Redick': 'J.J. Redick',
      'TJ Warren': 'T.J. Warren',
      'PJ Tucker': 'P.J. Tucker'
    };

    let totalProcessed = 0;
    let totalInserted = 0;

    for (const sheetName of draftSheets) {
      const year = parseInt(sheetName.split(' ')[0]);
      const seasonId = seasonYearToId[year];
      
      if (!seasonId) {
        console.log(`❌ No season found for ${year}, skipping...`);
        continue;
      }

      console.log(`\n📊 Processing ${year} Draft Sheet...`);

      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Find column indices
      const headers = data[0];
      const playerCol = headers.indexOf('Player');
      const priceCol = headers.indexOf('Price');
      const teamCol = headers.indexOf('Team');
      const keeperYearsCol = headers.indexOf('Keeper Years');

      if (playerCol === -1 || teamCol === -1) {
        console.log(`❌ Required columns not found in ${sheetName}`);
        continue;
      }

      // Extract records
      const seasonRecords = [];
      const unmatchedRecords = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        let playerName = row[playerCol];
        const price = row[priceCol];
        const teamName = row[teamCol];
        const keeperYears = row[keeperYearsCol];

        if (!playerName || !teamName) continue;

        // Apply name mapping
        const mappedName = commonNameMappings[playerName] || playerName;
        const playerId = playerNameToId.get(mappedName.toLowerCase());
        const managerId = managerMap[teamName];

        if (playerId && managerId) {
          seasonRecords.push({
            player_id: playerId,
            season_id: seasonId,
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
            hasManager: !!managerId
          });
        }
      }

      console.log(`  📋 Extracted ${seasonRecords.length} records, ${unmatchedRecords.length} unmatched`);

      if (unmatchedRecords.length > 0) {
        console.log(`  ❓ First 5 unmatched: ${unmatchedRecords.slice(0, 5).map(r => r.original).join(', ')}`);
      }

      // Clear existing data for this season and insert new complete data
      if (seasonRecords.length > 0) {
        console.log(`  🧹 Clearing existing ${year} data...`);
        const { error: deleteError } = await supabase
          .from('draft_results')
          .delete()
          .eq('season_id', seasonId);

        if (deleteError) {
          console.error(`  ❌ Error clearing ${year}:`, deleteError.message);
          continue;
        }

        console.log(`  📥 Inserting ${seasonRecords.length} records...`);
        const { error: insertError } = await supabase
          .from('draft_results')
          .insert(seasonRecords);

        if (insertError) {
          console.error(`  ❌ Error inserting ${year}:`, insertError.message);
        } else {
          console.log(`  ✅ Successfully inserted ${seasonRecords.length} records for ${year}`);
          totalInserted += seasonRecords.length;
        }
      }

      totalProcessed++;
    }

    console.log(`\n🎉 PROCESSING COMPLETE!`);
    console.log(`📊 Seasons processed: ${totalProcessed}`);
    console.log(`📥 Total records inserted: ${totalInserted}`);

    // Final verification
    console.log(`\n🔍 Final verification by season:`);
    for (const sheetName of draftSheets) {
      const year = parseInt(sheetName.split(' ')[0]);
      const seasonId = seasonYearToId[year];
      
      if (seasonId) {
        const { count } = await supabase
          .from('draft_results')
          .select('*', { count: 'exact', head: true })
          .eq('season_id', seasonId);

        console.log(`${year}: ${count} records`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Ask for confirmation since this is a major operation
console.log('🚨 This will process ALL draft sheets and replace existing data.');
console.log('This is a major operation that will insert thousands of records.');
console.log('Run with: node process-all-draft-sheets.js confirm');

if (process.argv[2] === 'confirm') {
  processAllDraftSheets();
} else {
  console.log('Add "confirm" as an argument to proceed.');
}