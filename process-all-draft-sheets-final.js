const XLSX = require('xlsx');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function processAllDraftSheetsFinal() {
  try {
    console.log('🚀 Final processing of all draft sheets with correct structure...\n');

    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    
    const draftSheets = workbook.SheetNames.filter(name => 
      /^\d{4}\s+Draft\s+Sheet$/.test(name)
    ).sort();

    // Load mappings
    const { data: seasons } = await supabase.from('seasons').select('*');
    const seasonYearToId = {};
    seasons.forEach(season => { seasonYearToId[season.year] = season.id; });

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
    
    console.log(`🎯 Loaded ${allPlayers.length} total players`);
    const playerNameToId = new Map();
    allPlayers.forEach(player => { playerNameToId.set(player.name.toLowerCase(), player.bbm_id); });

    // Enhanced name mappings
    const nameMap = {
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
      'JJ Redick': 'J.J. Redick',
      'TJ Warren': 'T.J. Warren',
      'PJ Tucker': 'P.J. Tucker',
      'CJ Miles': 'C.J. Miles',
      'JR Smith': 'J.R. Smith',
      'Demarcus Cousins': 'DeMarcus Cousins',
      'DeAndre Jordan': 'DeAndre Jordan'
    };

    let totalInserted = 0;
    let allUnmatched = [];

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

      // Determine format based on year
      let playerCol, priceCol, teamCol, keeperYearsCol, dataStartRow;
      
      if (year >= 2023) {
        // New format: Player=0, Price=2, Team=3, Keeper Years=4
        playerCol = 0;
        priceCol = 2;
        teamCol = 3;
        keeperYearsCol = 4;
        dataStartRow = 2; // Data starts at row 2 for 2023
      } else if (year === 2017 || year === 2022) {
        // Special format: columns shifted right by 1, Player=1, Price=2, Team=3, Keeper Years=4
        playerCol = 1;
        priceCol = 2;
        teamCol = 3;
        keeperYearsCol = 4;
        dataStartRow = 2;
      } else {
        // Old format: headers in row 1, Player=0, Price=1, Team=2, Keeper Years=3
        playerCol = 0;
        priceCol = 1;
        teamCol = 2;
        keeperYearsCol = 3;
        dataStartRow = 2;
      }

      console.log(`   📋 Format: Player=${playerCol}, Price=${priceCol}, Team=${teamCol}, Keeper=${keeperYearsCol}, Start=${dataStartRow}`);

      // Extract records
      const seasonRecords = [];
      const unmatchedRecords = [];

      for (let i = dataStartRow; i < data.length; i++) {
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
            season_id: seasonId,
            draft_price: price || null,
            manager_id: managerId,
            is_keeper: keeperYears ? true : false
          });
        } else {
          unmatchedRecords.push({
            year,
            original: playerName,
            mapped: mappedName,
            team: teamName,
            hasPlayer: !!playerId,
            hasManager: !!managerId,
            price
          });
        }
      }

      console.log(`   📊 Extracted ${seasonRecords.length} valid records, ${unmatchedRecords.length} unmatched`);
      allUnmatched.push(...unmatchedRecords);

      if (unmatchedRecords.length > 0) {
        console.log(`   ❓ Sample unmatched: ${unmatchedRecords.slice(0, 3).map(r => r.original).join(', ')}`);
      }

      // Insert records
      if (seasonRecords.length > 0) {
        console.log(`   🧹 Clearing existing ${year} data...`);
        const { error: deleteError } = await supabase
          .from('draft_results')
          .delete()
          .eq('season_id', seasonId);

        if (deleteError) {
          console.error(`   ❌ Error clearing ${year}:`, deleteError.message);
          continue;
        }

        console.log(`   📥 Inserting ${seasonRecords.length} records...`);
        const { error: insertError } = await supabase
          .from('draft_results')
          .insert(seasonRecords);

        if (insertError) {
          console.error(`   ❌ Error inserting ${year}:`, insertError.message);
        } else {
          console.log(`   ✅ Successfully inserted ${seasonRecords.length} records for ${year}`);
          totalInserted += seasonRecords.length;
        }
      }
    }

    console.log(`\n🎉 PROCESSING COMPLETE!`);
    console.log(`📥 Total records inserted: ${totalInserted}`);
    console.log(`❓ Total unmatched: ${allUnmatched.length}`);

    // Save unmatched for analysis
    if (allUnmatched.length > 0) {
      fs.writeFileSync('all-unmatched-players.json', JSON.stringify(allUnmatched, null, 2));
      console.log('💾 Unmatched players saved to all-unmatched-players.json');
    }

    // Final verification
    console.log(`\n🔍 Final record counts by season:`);
    const totalRecords = [];
    for (const sheetName of draftSheets) {
      const year = parseInt(sheetName.split(' ')[0]);
      const seasonId = seasonYearToId[year];
      
      if (seasonId) {
        const { count } = await supabase
          .from('draft_results')
          .select('*', { count: 'exact', head: true })
          .eq('season_id', seasonId);

        console.log(`${year}: ${count} records`);
        totalRecords.push(count);
      }
    }

    const grandTotal = totalRecords.reduce((sum, count) => sum + count, 0);
    console.log(`\n🏆 GRAND TOTAL: ${grandTotal} draft records across all seasons!`);

  } catch (error) {
    console.error('Error:', error);
  }
}

console.log('🚨 This will process ALL 12 draft sheets and insert thousands of records.');
console.log('Run with: node process-all-draft-sheets-final.js confirm');

if (process.argv[2] === 'confirm') {
  processAllDraftSheetsFinal();
} else {
  console.log('Add "confirm" as an argument to proceed.');
}