const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function extractRow27Managers() {
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

    // All possible manager names
    const allManagerNames = [
      'Amish', 'Bier', 'Buchs', 'Emmer', 'Gabe', 'Haight', 'Horn', 'Jones',
      'Luskey', 'MikeMac', 'Mitch', 'Peskin', 'Phil', 'Tmac', 'Weeg'
    ];

    // Get manager names from row 27 (index 26)
    const managerRow = data[26]; // Row 27 is index 26
    const secondGroupManagers = [];
    const secondGroupColumns = [];

    console.log('Examining row 27 for manager names:');
    if (managerRow) {
      for (let i = 0; i < managerRow.length; i += 4) {
        if (managerRow[i] && typeof managerRow[i] === 'string' && managerRow[i].trim()) {
          secondGroupManagers.push(managerRow[i].trim());
          secondGroupColumns.push(i);
          console.log(`  Column ${i}: ${managerRow[i]}`);
        }
      }
    }

    console.log('Found second group managers:', secondGroupManagers);
    console.log('At columns:', secondGroupColumns);

    const rosters = [];
    const unmatchedPlayers = new Set();

    // Process each manager in the second group
    for (let managerIndex = 0; managerIndex < secondGroupManagers.length; managerIndex++) {
      const managerName = secondGroupManagers[managerIndex];
      const columnIndex = secondGroupColumns[managerIndex];
      
      const managerId = managerMap[managerName.toLowerCase()];
      if (!managerId) {
        console.log(`Manager not found in database: ${managerName}`);
        continue;
      }

      console.log(`\nProcessing ${managerName} (column ${columnIndex})...`);
      
      // Go through rows starting from row 28 (index 27)
      for (let rowIndex = 27; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        if (!row || row[columnIndex] === undefined || row[columnIndex] === null) {
          // Skip empty cells
          continue;
        }
        
        const cellValue = row[columnIndex];
        if (typeof cellValue !== 'string' || !cellValue.trim()) {
          // Skip empty string cells
          continue;
        }
        
        const cleanValue = cellValue.trim();
        
        // Stop conditions: hit ANY manager name OR "offseason drops"
        if (allManagerNames.some(mgr => mgr.toLowerCase() === cleanValue.toLowerCase()) ||
            cleanValue.toLowerCase().includes('offseason drops')) {
          console.log(`  Stopping at: ${cleanValue}`);
          break;
        }
        
        // Skip obvious non-player entries
        if (cleanValue.toLowerCase().includes('keep') ||
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
            cleanValue.replace(/\s+/g, ' '), // normalize spaces
            // Try R.J. format
            cleanValue.replace(/^RJ\s/, 'R.J. '),
            cleanValue.replace(/^PJ\s/, 'P.J. '),
            cleanValue.replace(/^CJ\s/, 'C.J. '),
            cleanValue.replace(/^JJ\s/, 'J.J. ')
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

    console.log(`\nExtracted ${rosters.length} roster entries for second group`);
    
    if (unmatchedPlayers.size > 0) {
      console.log(`\nUnmatched players (${unmatchedPlayers.size}):`);
      Array.from(unmatchedPlayers).forEach(name => console.log(`  ${name}`));
    }

    if (rosters.length > 0) {
      console.log('\nInserting second group rosters into database...');
      const { error: insertError } = await supabase
        .from('rosters')
        .insert(rosters);

      if (insertError) {
        console.error('Error inserting rosters:', insertError.message);
      } else {
        console.log(`Successfully inserted ${rosters.length} roster entries`);
      }
    }

    // Final count
    const { data: totalRosters } = await supabase
      .from('rosters')
      .select('id')
      .eq('season_id', season2024_25.id);

    console.log(`Total rosters now: ${totalRosters ? totalRosters.length : 0}`);

    // Show breakdown by manager
    const { data: rosterBreakdown } = await supabase
      .from('rosters')
      .select(`
        managers!inner(manager_name),
        players!inner(name)
      `)
      .eq('season_id', season2024_25.id);

    if (rosterBreakdown) {
      const managerCounts = {};
      rosterBreakdown.forEach(roster => {
        const managerName = roster.managers.manager_name;
        managerCounts[managerName] = (managerCounts[managerName] || 0) + 1;
      });

      console.log('\nAll manager roster counts:');
      Object.entries(managerCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([manager, count]) => {
          console.log(`  ${manager}: ${count} players`);
        });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

extractRow27Managers();