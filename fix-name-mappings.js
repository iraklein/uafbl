const XLSX = require('xlsx');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixNameMappings() {
  try {
    console.log('Fixing name mappings and completing 2024 data...\n');

    // Create name mapping from draft sheet names to database names
    const nameMapping = {
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
      'Kevin Porter': 'Kevin Porter Jr.'
    };

    // Extract 2024 draft data again with name mapping
    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    const draftSheet = workbook.Sheets['2024 Draft Sheet'];
    const data = XLSX.utils.sheet_to_json(draftSheet, { header: 1 });

    const headers = data[0];
    const playerCol = headers.indexOf('Player');
    const priceCol = headers.indexOf('Price');
    const teamCol = headers.indexOf('Team');
    const keeperYearsCol = headers.indexOf('Keeper Years');

    // Load manager mapping
    const managers = JSON.parse(fs.readFileSync('managers-list.json', 'utf8'));
    const managerMap = {};
    managers.forEach(manager => {
      managerMap[manager.manager_name] = manager.id;
    });

    // Get all players from database
    const { data: allPlayers } = await supabase
      .from('players')
      .select('bbm_id, name');

    const playerNameToId = new Map();
    allPlayers.forEach(player => {
      playerNameToId.set(player.name.toLowerCase(), player.bbm_id);
    });

    // Extract records with name mapping
    const draftRecords = [];
    const stillUnmatched = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      let playerName = row[playerCol];
      const price = row[priceCol];
      const teamName = row[teamCol];
      const keeperYears = row[keeperYearsCol];

      if (playerName && teamName) {
        // Apply name mapping if exists
        const mappedName = nameMapping[playerName] || playerName;
        const playerId = playerNameToId.get(mappedName.toLowerCase());
        const managerId = managerMap[teamName];

        if (playerId && managerId) {
          draftRecords.push({
            player_id: playerId,
            season_id: 19,
            draft_price: price || null,
            manager_id: managerId,
            is_keeper: keeperYears ? true : false
          });
        } else {
          stillUnmatched.push({
            original: playerName,
            mapped: mappedName,
            team: teamName,
            hasPlayerId: !!playerId,
            hasManagerId: !!managerId
          });
        }
      }
    }

    console.log(`Successfully mapped ${draftRecords.length} records`);
    console.log(`Still unmatched: ${stillUnmatched.length}`);

    if (stillUnmatched.length > 0) {
      console.log('\nStill unmatched:');
      stillUnmatched.forEach((record, index) => {
        console.log(`${index + 1}. ${record.original} -> ${record.mapped} (Player: ${record.hasPlayerId}, Manager: ${record.hasManagerId})`);
      });

      // Check for the remaining ones manually
      console.log('\nChecking remaining unmatched players...');
      for (const record of stillUnmatched) {
        if (!record.hasPlayerId) {
          // Look for close matches
          const possibleMatches = allPlayers.filter(p => {
            const nameParts = record.mapped.toLowerCase().split(' ');
            const dbNameParts = p.name.toLowerCase().split(' ');
            return nameParts.some(part => dbNameParts.some(dbPart => dbPart.includes(part) && part.length > 2));
          });

          if (possibleMatches.length > 0) {
            console.log(`"${record.mapped}" possible matches:`);
            possibleMatches.slice(0, 3).forEach(p => console.log(`  - ${p.name} (ID: ${p.bbm_id})`));
          }
        }
      }
    }

    // Clear existing 2024 data and insert complete set
    if (draftRecords.length > 0) {
      console.log('\nClearing existing 2024 data...');
      const { error: deleteError } = await supabase
        .from('draft_results')
        .delete()
        .eq('season_id', 19);

      if (deleteError) {
        console.error('Error clearing data:', deleteError.message);
        return;
      }

      console.log(`Inserting ${draftRecords.length} complete 2024 records...`);
      const { data, error } = await supabase
        .from('draft_results')
        .insert(draftRecords);

      if (error) {
        console.error('Error inserting records:', error.message);
      } else {
        console.log(`✅ Successfully inserted ${draftRecords.length} records`);
      }

      // Final count
      const { count: finalCount } = await supabase
        .from('draft_results')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', 19);

      console.log(`\nFinal 2024 records in database: ${finalCount} out of 192 expected`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

fixNameMappings();