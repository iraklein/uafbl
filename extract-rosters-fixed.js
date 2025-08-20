const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function extractRostersFixed() {
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

    // Get manager names from header row
    const headerRow = data[0];
    const managerNames = [];
    const managerColumns = [];

    for (let i = 0; i < headerRow.length; i += 4) {
      if (headerRow[i] && typeof headerRow[i] === 'string') {
        managerNames.push(headerRow[i]);
        managerColumns.push(i);
      }
    }

    console.log('Found managers:', managerNames);

    // Clear existing rosters for this season first
    console.log('Clearing existing rosters for 2024-25 season...');
    await supabase
      .from('rosters')
      .delete()
      .eq('season_id', season2024_25.id);

    const rosters = [];
    const unmatchedPlayers = new Set();

    // Process each manager column
    for (let managerIndex = 0; managerIndex < managerNames.length; managerIndex++) {
      const managerName = managerNames[managerIndex];
      const columnIndex = managerColumns[managerIndex];
      
      const managerId = managerMap[managerName.toLowerCase()];
      if (!managerId) {
        console.log(`Manager not found: ${managerName}`);
        continue;
      }

      console.log(`\nProcessing ${managerName} (column ${columnIndex})...`);
      
      // Go through all rows for this manager
      for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        if (!row || !row[columnIndex]) continue;
        
        const cellValue = row[columnIndex];
        if (typeof cellValue !== 'string' || !cellValue.trim()) continue;
        
        const cleanValue = cellValue.trim();
        
        // Skip if this is another manager name (indicates we've moved to next team)
        if (managerNames.some(mgr => mgr.toLowerCase() === cleanValue.toLowerCase())) {
          console.log(`  Hit manager name: ${cleanValue}, stopping for this column`);
          break;
        }
        
        // Skip obvious non-player entries
        if (cleanValue.toLowerCase().includes('offseason') || 
            cleanValue.toLowerCase().includes('drop') ||
            cleanValue.toLowerCase().includes('keep') ||
            cleanValue.toLowerCase().includes('cash') ||
            cleanValue.toLowerCase().includes('slots') ||
            /^\d+$/.test(cleanValue)) { // Skip pure numbers
          continue;
        }

        // Try to find player
        let playerId = playerMap[cleanValue.toLowerCase()];
        
        // Try some common name variations if not found
        if (!playerId) {
          const variations = [
            cleanValue.replace(/Jr\.?$/, 'Jr.'),
            cleanValue.replace(/Jr\.?$/, 'Jr..'),
            cleanValue.replace(/Jr\.?$/, ', Jr.'),
            cleanValue.replace(/Jr\.?$/, ', Jr..'),
            cleanValue.replace(/,\s*Jr\.?/, ', Jr.'),
            cleanValue.replace(/,\s*Jr\.?/, ', Jr..'),
            cleanValue.replace(/\s+/g, ' ') // normalize spaces
          ];
          
          for (const variation of variations) {
            playerId = playerMap[variation.toLowerCase()];
            if (playerId) {
              console.log(`  Found with variation: "${cleanValue}" -> "${variation}"`);
              break;
            }
          }
        }

        if (playerId) {
          rosters.push({
            season_id: season2024_25.id,
            player_id: playerId,
            manager_id: managerId,
            keeper_cost: null
          });
          console.log(`  ✓ ${cleanValue}`);
        } else {
          unmatchedPlayers.add(cleanValue);
          console.log(`  ✗ ${cleanValue} (not found)`);
        }
      }
    }

    console.log(`\nExtracted ${rosters.length} total roster entries`);
    
    if (unmatchedPlayers.size > 0) {
      console.log(`\nUnmatched players (${unmatchedPlayers.size}):`);
      Array.from(unmatchedPlayers).slice(0, 20).forEach(name => console.log(`  ${name}`));
      if (unmatchedPlayers.size > 20) {
        console.log(`  ... and ${unmatchedPlayers.size - 20} more`);
      }
    }

    if (rosters.length > 0) {
      console.log('\nInserting rosters into database...');
      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < rosters.length; i += batchSize) {
        const batch = rosters.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('rosters')
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError.message);
        } else {
          insertedCount += batch.length;
          console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
        }
      }

      console.log(`\nCompleted! Inserted ${insertedCount} of ${rosters.length} roster entries`);
    }

    // Final count
    const { data: totalRosters } = await supabase
      .from('rosters')
      .select('id')
      .eq('season_id', season2024_25.id);

    console.log(`Final total rosters: ${totalRosters ? totalRosters.length : 0} / 210 target`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

extractRostersFixed();