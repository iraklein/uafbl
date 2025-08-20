const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Manual mapping for unmatched players based on the search results
const playerNameMappings = {
  'vince williams jr.': 'Vince Williams, Jr..',
  'cameron johnson': 'Cameron Johnson',
  'jaren jackson, jr.': 'Jaren Jackson, Jr..',
  'michael porter, jr.': 'Michael Porter, Jr..',
  'tim hardaway jr': 'Tim Hardaway, Jr.',
  'sandro mamukelashvii': 'Sandro Mamukelashvili',
  'rj barrett': 'RJ Barrett',
  // These might need manual checking/addition
  'ron holland ii': null, // Might be a new player not in DB
  'reece beekman': null, // Might be a new player not in DB
  'jeff dowtin jr': null, // Might need exact name check
};

async function fixUnmatchedRosters() {
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    const sheet = workbook.Sheets['2025 Offseason Rosters'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Get season, managers, and players
    const { data: seasons } = await supabase
      .from('seasons')
      .select('id, name, year')
      .or('name.ilike.%2024-25%,year.eq.2024');
    
    const season2024_25 = seasons.find(s => s.name.includes('2024-25') || s.year === 2024);

    const { data: managers } = await supabase.from('managers').select('id, manager_name');
    const { data: players } = await supabase.from('players').select('id, name');

    const managerMap = {};
    managers.forEach(manager => {
      managerMap[manager.manager_name.toLowerCase()] = manager.id;
    });

    const playerMap = {};
    players.forEach(player => {
      playerMap[player.name.toLowerCase()] = player.id;
    });

    // Extract manager names and columns from header
    const headerRow = data[0];
    const managerNames = [];
    const managerColumns = [];

    for (let i = 0; i < headerRow.length; i += 4) {
      if (headerRow[i] && typeof headerRow[i] === 'string') {
        managerNames.push(headerRow[i]);
        managerColumns.push(i);
      }
    }

    const newRosters = [];
    let fixedCount = 0;
    let stillUnmatched = [];

    // Process each data row
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row || row.length === 0) continue;

      // For each manager column
      for (let managerIndex = 0; managerIndex < managerNames.length; managerIndex++) {
        const managerName = managerNames[managerIndex];
        const columnIndex = managerColumns[managerIndex];
        const playerName = row[columnIndex];
        
        if (playerName && typeof playerName === 'string' && playerName.trim() !== '') {
          const cleanPlayerName = playerName.trim();
          const cleanManagerName = managerName.trim();
          
          const managerId = managerMap[cleanManagerName.toLowerCase()];
          if (!managerId) continue;

          // First try direct match
          let playerId = playerMap[cleanPlayerName.toLowerCase()];
          
          // If no direct match, try mapped name
          if (!playerId && playerNameMappings[cleanPlayerName.toLowerCase()]) {
            const mappedName = playerNameMappings[cleanPlayerName.toLowerCase()];
            if (mappedName) {
              playerId = playerMap[mappedName.toLowerCase()];
              if (playerId) {
                console.log(`Fixed mapping: "${cleanPlayerName}" -> "${mappedName}"`);
                fixedCount++;
              }
            }
          }

          if (!playerId) {
            if (!stillUnmatched.includes(cleanPlayerName)) {
              stillUnmatched.push(cleanPlayerName);
            }
            continue;
          }

          // Check if this roster entry already exists
          const { data: existingRoster } = await supabase
            .from('rosters')
            .select('id')
            .eq('season_id', season2024_25.id)
            .eq('player_id', playerId)
            .eq('manager_id', managerId)
            .single();

          if (!existingRoster) {
            newRosters.push({
              season_id: season2024_25.id,
              player_id: playerId,
              manager_id: managerId,
              keeper_cost: null
            });
          }
        }
      }
    }

    console.log(`\nFixed ${fixedCount} player name mappings`);
    console.log(`Found ${newRosters.length} new rosters to insert`);
    
    if (stillUnmatched.length > 0) {
      console.log('Still unmatched players:', stillUnmatched);
    }

    if (newRosters.length > 0) {
      console.log('\nInserting new rosters...');
      const { error: insertError } = await supabase
        .from('rosters')
        .insert(newRosters);

      if (insertError) {
        console.error('Error inserting rosters:', insertError.message);
      } else {
        console.log(`Successfully inserted ${newRosters.length} additional roster entries`);
      }
    }

    // Get final count
    const { data: totalRosters } = await supabase
      .from('rosters')
      .select('id')
      .eq('season_id', season2024_25.id);

    console.log(`\nTotal rosters for 2024-25 season: ${totalRosters ? totalRosters.length : 0}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixUnmatchedRosters();