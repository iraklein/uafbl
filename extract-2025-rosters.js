const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client using the same config as the app
const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
  console.log('Please set it by running: export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function extractAndInsertRosters() {
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    const sheet = workbook.Sheets['2025 Offseason Rosters'];
    
    if (!sheet) {
      throw new Error('2025 Offseason Rosters sheet not found');
    }

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log('Sheet data loaded, rows:', data.length);

    // First, get the 2024-25 season ID
    console.log('Finding 2024-25 season...');
    const { data: seasons, error: seasonError } = await supabase
      .from('seasons')
      .select('id, name, year')
      .or('name.ilike.%2024-25%,year.eq.2024');

    if (seasonError) {
      throw new Error(`Failed to fetch season: ${seasonError.message}`);
    }

    const season2024_25 = seasons.find(s => s.name.includes('2024-25') || s.year === 2024);
    if (!season2024_25) {
      throw new Error('2024-25 season not found in database');
    }

    console.log(`Found season: ${season2024_25.name} (ID: ${season2024_25.id})`);

    // Get all managers
    console.log('Fetching managers...');
    const { data: managers, error: managersError } = await supabase
      .from('managers')
      .select('id, manager_name');

    if (managersError) {
      throw new Error(`Failed to fetch managers: ${managersError.message}`);
    }

    // Get all players
    console.log('Fetching players...');
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name');

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }

    // Create lookup maps
    const managerMap = {};
    managers.forEach(manager => {
      managerMap[manager.manager_name.toLowerCase()] = manager.id;
    });

    const playerMap = {};
    players.forEach(player => {
      playerMap[player.name.toLowerCase()] = player.id;
    });

    console.log(`Manager map created with ${Object.keys(managerMap).length} managers`);
    console.log(`Player map created with ${Object.keys(playerMap).length} players`);

    // Parse the roster data
    const rosters = [];
    let unmatchedPlayers = [];
    let unmatchedManagers = [];

    // The first row contains manager info: manager name, cash, slots, "Keep"
    // Data starts from row 1 (0-indexed)
    if (data.length < 2) {
      throw new Error('Not enough data in the sheet');
    }

    // Extract manager names from first row
    const headerRow = data[0];
    const managerNames = [];
    const managerColumns = [];

    // Manager names appear every 4 columns starting from column 0
    for (let i = 0; i < headerRow.length; i += 4) {
      if (headerRow[i] && typeof headerRow[i] === 'string') {
        managerNames.push(headerRow[i]);
        managerColumns.push(i);
      }
    }

    console.log('Found managers in header:', managerNames);

    // Process each data row (starting from row 1)
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row || row.length === 0) continue;

      // For each manager column
      for (let managerIndex = 0; managerIndex < managerNames.length; managerIndex++) {
        const managerName = managerNames[managerIndex];
        const columnIndex = managerColumns[managerIndex];
        
        // Player name is at the manager's column
        const playerName = row[columnIndex];
        
        if (playerName && typeof playerName === 'string' && playerName.trim() !== '') {
          const cleanPlayerName = playerName.trim();
          const cleanManagerName = managerName.trim();
          
          // Find manager ID
          const managerId = managerMap[cleanManagerName.toLowerCase()];
          if (!managerId) {
            if (!unmatchedManagers.includes(cleanManagerName)) {
              unmatchedManagers.push(cleanManagerName);
            }
            continue;
          }

          // Find player ID
          const playerId = playerMap[cleanPlayerName.toLowerCase()];
          if (!playerId) {
            if (!unmatchedPlayers.includes(cleanPlayerName)) {
              unmatchedPlayers.push(cleanPlayerName);
            }
            continue;
          }

          // Add to rosters (keeper_cost will be calculated automatically)
          rosters.push({
            season_id: season2024_25.id,
            player_id: playerId,
            manager_id: managerId,
            keeper_cost: null // Will be calculated automatically before insertion
          });
        }
      }
    }

    console.log(`\nExtracted ${rosters.length} roster entries`);
    
    if (unmatchedManagers.length > 0) {
      console.log('Unmatched managers:', unmatchedManagers);
    }
    
    if (unmatchedPlayers.length > 0) {
      console.log(`Unmatched players (${unmatchedPlayers.length}):`, unmatchedPlayers.slice(0, 10));
      if (unmatchedPlayers.length > 10) {
        console.log('... and', unmatchedPlayers.length - 10, 'more');
      }
    }

    if (rosters.length === 0) {
      console.log('No rosters to insert');
      return;
    }

    // Calculate keeper costs for all players before insertion
    console.log('\nCalculating keeper costs for all players...');
    const { calculateKeeperCostsForRosters } = require('./lib/calculate-keeper-cost-for-roster.js');
    const playerIds = [...new Set(rosters.map(r => r.player_id))]; // Get unique player IDs
    const keeperCostMap = await calculateKeeperCostsForRosters(supabase, playerIds, season2024_25.id);
    
    // Apply calculated keeper costs to roster entries
    rosters.forEach(roster => {
      roster.keeper_cost = keeperCostMap[roster.player_id] || null;
    });
    
    console.log(`Applied keeper costs to ${rosters.length} roster entries`);

    // Insert rosters in batches
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
        // Continue with next batch instead of stopping
      } else {
        insertedCount += batch.length;
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
      }
    }

    console.log(`\nCompleted! Inserted ${insertedCount} of ${rosters.length} roster entries`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the extraction
extractAndInsertRosters();