const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix2024Data() {
  try {
    console.log('Identifying exactly what 2024 records are missing...\n');

    const season2024Id = 19;

    // Get all existing 2024 draft records
    const { data: existing2024 } = await supabase
      .from('draft_results')
      .select('player_id')
      .eq('season_id', season2024Id);

    const existingPlayerIds = new Set(existing2024.map(r => r.player_id));
    console.log(`Currently have ${existing2024.length} 2024 records in database`);

    // Get our extracted 2024 data
    const rawData = JSON.parse(fs.readFileSync('draft-results-with-season-id.json', 'utf8'));
    const raw2024 = rawData.filter(r => r.season_year === 2024);
    console.log(`Have ${raw2024.length} records in extracted data`);

    // Find records that should be inserted but aren't
    const missingRecords = [];
    raw2024.forEach(record => {
      if (!existingPlayerIds.has(record.player_id)) {
        missingRecords.push({
          player_id: record.player_id,
          season_id: record.season_id,
          draft_price: record.draft_price,
          manager_id: record.manager_id,
          is_keeper: record.is_keeper,
          player_name: record.player_name, // for debugging
          team_name: record.team_name // for debugging
        });
      }
    });

    console.log(`Found ${missingRecords.length} missing 2024 records:`);
    missingRecords.forEach((record, index) => {
      console.log(`${index + 1}. ${record.player_name} -> ${record.team_name} ($${record.draft_price}) [Player ID: ${record.player_id}]`);
    });

    if (missingRecords.length > 0) {
      // Check if any of these players don't exist in players table
      const { data: allPlayers } = await supabase
        .from('players')
        .select('bbm_id, name');

      const existingPlayerIdsInTable = new Set(allPlayers.map(p => p.bbm_id));
      
      const playersToAdd = [];
      const recordsToInsert = [];

      missingRecords.forEach(record => {
        if (!existingPlayerIdsInTable.has(record.player_id)) {
          // Player doesn't exist, need to add them first
          playersToAdd.push({
            bbm_id: record.player_id,
            name: record.player_name
          });
        }
        
        // Clean record for insertion
        recordsToInsert.push({
          player_id: record.player_id,
          season_id: record.season_id,
          draft_price: record.draft_price,
          manager_id: record.manager_id,
          is_keeper: record.is_keeper
        });
      });

      // Add missing players first
      if (playersToAdd.length > 0) {
        console.log(`\nAdding ${playersToAdd.length} missing players...`);
        for (const player of playersToAdd) {
          const { error } = await supabase
            .from('players')
            .insert([player]);
          
          if (error && !error.message.includes('duplicate key')) {
            console.error(`Error adding ${player.name}:`, error.message);
          } else {
            console.log(`✅ Added player: ${player.name}`);
          }
        }
      }

      // Insert missing draft records
      console.log(`\nInserting ${recordsToInsert.length} missing draft records...`);
      const { data, error } = await supabase
        .from('draft_results')
        .insert(recordsToInsert);

      if (error) {
        console.error('Error inserting records:', error.message);
      } else {
        console.log(`✅ Successfully inserted ${recordsToInsert.length} records`);
      }

      // Final count check
      const { count: finalCount } = await supabase
        .from('draft_results')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', season2024Id);

      console.log(`\nFinal 2024 records in database: ${finalCount}`);
      
      if (finalCount < 192) {
        console.log(`\nStill missing ${192 - finalCount} records. Let's check what might be in the 2024 sheet directly...`);
        
        // Let's check the actual 2024 sheet for comparison
        const XLSX = require('xlsx');
        const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
        
        if (workbook.SheetNames.includes('2024')) {
          const sheet2024 = workbook.Sheets['2024'];
          const data2024 = XLSX.utils.sheet_to_json(sheet2024, { header: 1 });
          console.log(`2024 sheet has ${data2024.length - 1} rows (excluding header)`);
          
          // Show structure
          console.log('2024 sheet headers:', data2024[0]);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

fix2024Data();