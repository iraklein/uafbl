const XLSX = require('xlsx');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function processEarlyYearsCorrect() {
  try {
    console.log('🚀 Processing early years (2007-2015) with CORRECT double-section format...\n');

    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    const years = [2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015];
    
    // Load mappings
    const { data: seasons } = await supabase.from('seasons').select('*');
    const seasonYearToId = {};
    seasons.forEach(season => { seasonYearToId[season.year] = season.id; });

    const managers = JSON.parse(fs.readFileSync('managers-list.json', 'utf8'));
    const managerMap = {};
    managers.forEach(manager => { managerMap[manager.manager_name] = manager.id; });

    // Load all players
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

    // Enhanced name mappings for early years
    const nameMap = {
      'Metta World Peace': 'Ron Artest',
      'LaMarcus Aldridge': 'LaMarcus Aldridge',
      'Andris Biedrins': 'Andris Biedriņš',
      'Demarcus Cousins': 'DeMarcus Cousins',
      'DeAndre Jordan': 'DeAndre Jordan',
      'Karl Anthony Towns': 'Karl-Anthony Towns',
      'Michael Porter, Jr.': 'Michael Porter Jr.',
      'Jaren Jackson, Jr.': 'Jaren Jackson Jr.',
      'Wendall Carter, Jr.': 'Wendell Carter Jr.',
      'Gary Trent, Jr.': 'Gary Trent',
      'Bogdan Bogdanovich': 'Bogdan Bogdanovic',
      'OG Anunoby': 'O.G. Anunoby',
      'CJ McCollum': 'C.J. McCollum',
      'RJ Barrett': 'R.J. Barrett',
      'JJ Redick': 'J.J. Redick',
      'TJ Warren': 'T.J. Warren',
      'PJ Tucker': 'P.J. Tucker',
      'CJ Miles': 'C.J. Miles',
      'JR Smith': 'J.R. Smith'
    };

    let totalInserted = 0;
    let allUnmatched = [];

    for (const year of years) {
      const seasonId = seasonYearToId[year];
      
      if (!seasonId) {
        console.log(`❌ No season found for ${year}, skipping...`);
        continue;
      }

      console.log(`\n📊 Processing ${year}...`);

      // Check if sheet exists
      const sheetName = year.toString();
      if (!workbook.Sheets[sheetName]) {
        console.log(`❌ No sheet found for ${year}, skipping...`);
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      console.log(`   📋 ${year} sheet has ${data.length} rows`);

      const seasonRecords = [];
      const unmatchedRecords = [];

      // Find section breaks (look for empty rows)
      const sectionBreaks = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const isEmpty = !row || row.every(cell => !cell);
        if (isEmpty) {
          sectionBreaks.push(i);
        }
      }

      console.log(`   📈 Found section breaks at rows: ${sectionBreaks.join(', ')}`);

      // Define sections
      const sections = [];
      
      // Section 1: From start to first empty row
      const firstBreak = sectionBreaks.length > 0 ? sectionBreaks[0] : data.length;
      if (firstBreak > 1) {
        sections.push({
          headerRow: 0,
          startRow: 1,
          endRow: firstBreak
        });
      }

      // Section 2: From after first break to next break (or end)
      if (sectionBreaks.length > 0 && firstBreak + 1 < data.length) {
        const nextHeaderRow = firstBreak + 1;
        const secondBreak = sectionBreaks.length > 1 ? sectionBreaks[1] : data.length;
        
        sections.push({
          headerRow: nextHeaderRow,
          startRow: nextHeaderRow + 1,
          endRow: secondBreak
        });
      }

      console.log(`   📊 Processing ${sections.length} sections`);

      // Process each section
      for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
        const section = sections[sectionIndex];
        console.log(`\n   📋 Section ${sectionIndex + 1}: Header row ${section.headerRow}, data rows ${section.startRow}-${section.endRow}`);

        // Get team names from header row
        const headerRow = data[section.headerRow] || [];
        const teamNames = [];
        const teamCols = [];
        const priceCols = [];

        // Extract team names and their column positions (every other column)
        for (let i = 0; i < headerRow.length; i += 2) {
          const teamName = headerRow[i];
          if (teamName && managerMap[teamName]) {
            teamNames.push(teamName);
            teamCols.push(i);
            priceCols.push(i + 1);
          }
        }

        console.log(`     🏈 Teams: ${teamNames.join(', ')}`);

        // Process each team column in this section
        for (let teamIndex = 0; teamIndex < teamNames.length; teamIndex++) {
          const teamName = teamNames[teamIndex];
          const playerCol = teamCols[teamIndex];
          const priceCol = priceCols[teamIndex];
          const managerId = managerMap[teamName];

          let teamPlayerCount = 0;

          // Process rows in this section
          for (let rowIndex = section.startRow; rowIndex < section.endRow; rowIndex++) {
            const row = data[rowIndex];
            if (!row) continue;

            let playerName = row[playerCol];
            const price = row[priceCol];

            if (!playerName) continue;

            playerName = playerName.toString().trim();
            
            // Apply name mapping
            const mappedName = nameMap[playerName] || playerName;
            const playerId = playerNameToId.get(mappedName.toLowerCase());

            if (playerId) {
              seasonRecords.push({
                player_id: playerId,
                season_id: seasonId,
                draft_price: price || null,
                manager_id: managerId,
                is_keeper: false // Early years had no keepers initially
              });
              teamPlayerCount++;
            } else {
              unmatchedRecords.push({
                year,
                original: playerName,
                mapped: mappedName,
                team: teamName,
                hasPlayer: false,
                hasManager: true,
                price: price,
                row: rowIndex + 1,
                col: playerCol,
                section: sectionIndex + 1
              });
            }
          }

          if (teamPlayerCount > 0) {
            console.log(`       ${teamName}: ${teamPlayerCount} players`);
          }
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
      fs.writeFileSync('early-years-unmatched-correct.json', JSON.stringify(allUnmatched, null, 2));
      console.log('💾 Unmatched players saved to early-years-unmatched-correct.json');
    }

    // Final verification
    console.log(`\n🔍 Final record counts:`)
    for (const year of years) {
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

console.log('🚨 This will process years 2007-2015 with CORRECT double-section format.');
console.log('Run with: node process-early-years-correct.js confirm');

if (process.argv[2] === 'confirm') {
  processEarlyYearsCorrect();
} else {
  console.log('Add "confirm" as an argument to proceed.');
}