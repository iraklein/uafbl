const XLSX = require('xlsx');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function extract2024DraftSheet() {
  try {
    console.log('Extracting data from 2024 Draft Sheet...\n');

    const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
    const draftSheet = workbook.Sheets['2024 Draft Sheet'];
    const data = XLSX.utils.sheet_to_json(draftSheet, { header: 1 });

    console.log(`2024 Draft Sheet has ${data.length} rows`);
    console.log('Headers:', data[0]);

    // Load manager mapping
    const managers = JSON.parse(fs.readFileSync('managers-list.json', 'utf8'));
    const managerMap = {};
    managers.forEach(manager => {
      managerMap[manager.manager_name] = manager.id;
      managerMap[manager.manager_name.toLowerCase()] = manager.id;
    });

    // Find column indices
    const headers = data[0];
    let playerCol = -1;
    let priceCol = -1;
    let teamCol = -1;
    let keeperYearsCol = -1;

    headers.forEach((header, index) => {
      if (header === 'Player') playerCol = index;
      if (header === 'Price') priceCol = index;
      if (header === 'Team') teamCol = index;
      if (header === 'Keeper Years') keeperYearsCol = index;
      if (header === 'Keeper Cost') keeperCostCol = index;
    });

    console.log(`Columns - Player: ${playerCol}, Price: ${priceCol}, Team: ${teamCol}, Keeper Years: ${keeperYearsCol}`);

    // Extract draft records
    const draftRecords = [];
    let skippedRecords = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const playerName = row[playerCol];
      const price = row[priceCol];
      const teamName = row[teamCol];
      const keeperYears = row[keeperYearsCol];

      if (playerName && teamName) {
        const managerId = managerMap[teamName];
        
        if (managerId) {
          draftRecords.push({
            player_name: playerName,
            team_name: teamName,
            manager_id: managerId,
            draft_price: price || null,
            is_keeper: keeperYears ? true : false,
            season_year: 2024,
            season_id: 19
          });
        } else {
          skippedRecords.push({ playerName, teamName, price, reason: 'Unknown team' });
        }
      } else if (playerName && !teamName) {
        skippedRecords.push({ playerName, teamName: 'MISSING', price, reason: 'No team' });
      }
    }

    console.log(`\nExtracted ${draftRecords.length} valid draft records`);
    console.log(`Skipped ${skippedRecords.length} records`);

    if (skippedRecords.length > 0) {
      console.log('\nSkipped records:');
      skippedRecords.forEach((record, index) => {
        console.log(`${index + 1}. ${record.playerName} -> ${record.teamName} ($${record.price}) [${record.reason}]`);
      });
    }

    // Show some examples
    console.log('\nFirst 10 valid records:');
    draftRecords.slice(0, 10).forEach((record, index) => {
      console.log(`${index + 1}. ${record.player_name} -> ${record.team_name} ($${record.draft_price}) ${record.is_keeper ? '[K]' : ''}`);
    });

    // Now we need to match player names to player IDs
    console.log('\nMatching player names to IDs...');

    const { data: allPlayers } = await supabase
      .from('players')
      .select('bbm_id, name');

    // Create name-to-ID mapping (case insensitive)
    const playerNameToId = new Map();
    allPlayers.forEach(player => {
      playerNameToId.set(player.name.toLowerCase(), player.bbm_id);
    });

    // Match records to player IDs
    const recordsWithIds = [];
    const unmatchedRecords = [];

    draftRecords.forEach(record => {
      const playerId = playerNameToId.get(record.player_name.toLowerCase());
      
      if (playerId) {
        recordsWithIds.push({
          player_id: playerId,
          season_id: record.season_id,
          draft_price: record.draft_price,
          manager_id: record.manager_id,
          is_keeper: record.is_keeper
        });
      } else {
        unmatchedRecords.push(record);
      }
    });

    console.log(`\nMatched ${recordsWithIds.length} records to player IDs`);
    console.log(`${unmatchedRecords.length} records couldn't be matched`);

    if (unmatchedRecords.length > 0) {
      console.log('\nUnmatched players (first 10):');
      unmatchedRecords.slice(0, 10).forEach((record, index) => {
        console.log(`${index + 1}. ${record.player_name}`);
      });
    }

    // Insert the matched records
    if (recordsWithIds.length > 0) {
      console.log(`\nInserting ${recordsWithIds.length} records into database...`);
      
      // First clear existing 2024 data to avoid duplicates
      console.log('Clearing existing 2024 data...');
      const { error: deleteError } = await supabase
        .from('draft_results')
        .delete()
        .eq('season_id', 19);

      if (deleteError) {
        console.error('Error clearing existing data:', deleteError.message);
      } else {
        console.log('✅ Cleared existing 2024 data');
      }

      // Insert new data
      const { data, error } = await supabase
        .from('draft_results')
        .insert(recordsWithIds);

      if (error) {
        console.error('Error inserting records:', error.message);
      } else {
        console.log(`✅ Successfully inserted ${recordsWithIds.length} records`);
      }

      // Final count
      const { count: finalCount } = await supabase
        .from('draft_results')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', 19);

      console.log(`\nFinal 2024 records in database: ${finalCount}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

extract2024DraftSheet();