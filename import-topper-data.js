require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey || !supabaseUrl) {
  console.error('Supabase configuration not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importTopperData() {
  console.log('Importing topper data...');
  
  try {
    // Load processed topper data
    const topperData = JSON.parse(fs.readFileSync('topper-processed-data.json', 'utf8'));
    console.log(`Found ${topperData.length} topper records to process`);
    
    // Get existing data for mappings
    const [managersResult, playersResult, seasonsResult] = await Promise.all([
      supabase.from('managers').select('id, manager_name'),
      supabase.from('players').select('id, name'),
      supabase.from('seasons').select('id, year')
    ]);
    
    if (managersResult.error || playersResult.error || seasonsResult.error) {
      console.error('Error fetching reference data:', {
        managers: managersResult.error,
        players: playersResult.error,
        seasons: seasonsResult.error
      });
      return;
    }
    
    // Create mappings
    const managerMap = {};
    managersResult.data.forEach(m => {
      managerMap[m.manager_name.toLowerCase()] = m.id;
    });
    
    const playerMap = {};
    playersResult.data.forEach(p => {
      playerMap[p.name] = p.id;
    });
    
    const seasonMap = {};
    seasonsResult.data.forEach(s => {
      seasonMap[s.year] = s.id;
    });
    
    console.log(`Loaded ${Object.keys(managerMap).length} managers, ${Object.keys(playerMap).length} players, ${Object.keys(seasonMap).length} seasons`);
    
    // Process topper records
    const topperRecords = [];
    const missingPlayers = new Set();
    const missingManagers = new Set();
    
    for (const topper of topperData) {
      // Map manager
      const managerId = managerMap[topper.manager.toLowerCase()];
      if (!managerId) {
        missingManagers.add(topper.manager);
        console.warn(`Missing manager: ${topper.manager}`);
        continue;
      }
      
      // Map season
      const seasonId = seasonMap[topper.year];
      if (!seasonId) {
        console.warn(`Missing season: ${topper.year}`);
        continue;
      }
      
      // Map player
      const playerId = playerMap[topper.player_name];
      if (!playerId) {
        missingPlayers.add(topper.player_name);
        console.warn(`Missing player: ${topper.player_name}`);
        continue; // Skip for now, we'll add missing players
      }
      
      topperRecords.push({
        manager_id: managerId,
        player_id: playerId,
        season_id: seasonId,
        is_winner: topper.is_winner,
        is_unused: topper.is_unused,
        notes: topper.notes
      });
    }
    
    console.log(`\nProcessing summary:`);
    console.log(`- Valid records: ${topperRecords.length}`);
    console.log(`- Missing players: ${missingPlayers.size}`);
    console.log(`- Missing managers: ${missingManagers.size}`);
    
    if (missingPlayers.size > 0) {
      console.log('\nMissing players:');
      Array.from(missingPlayers).forEach(player => console.log(`  - ${player}`));
      
      // Add missing players
      console.log('\nAdding missing players...');
      const { data: maxIdResult } = await supabase
        .from('players')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .single();
        
      let nextId = maxIdResult.id + 1;
      const newPlayers = Array.from(missingPlayers).map(playerName => ({
        id: nextId++,
        name: playerName
      }));
      
      const { data: insertedPlayers, error: insertError } = await supabase
        .from('players')
        .insert(newPlayers)
        .select();
        
      if (insertError) {
        console.error('Error inserting players:', insertError);
        return;
      }
      
      console.log(`Added ${insertedPlayers.length} new players`);
      
      // Update player map
      insertedPlayers.forEach(p => {
        playerMap[p.name] = p.id;
      });
      
      // Reprocess records with new player IDs
      for (const topper of topperData) {
        const managerId = managerMap[topper.manager.toLowerCase()];
        const seasonId = seasonMap[topper.year];
        const playerId = playerMap[topper.player_name];
        
        if (managerId && seasonId && playerId) {
          // Check if we already have this record
          const existingIndex = topperRecords.findIndex(r => 
            r.manager_id === managerId && r.season_id === seasonId
          );
          
          if (existingIndex === -1) {
            topperRecords.push({
              manager_id: managerId,
              player_id: playerId,
              season_id: seasonId,
              is_winner: topper.is_winner,
              is_unused: topper.is_unused,
              notes: topper.notes
            });
          }
        }
      }
    }
    
    console.log(`\nFinal record count: ${topperRecords.length}`);
    
    // Insert topper records in batches
    const batchSize = 50;
    let successCount = 0;
    
    for (let i = 0; i < topperRecords.length; i += batchSize) {
      const batch = topperRecords.slice(i, i + batchSize);
      
      console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(topperRecords.length / batchSize)}...`);
      
      const { data, error } = await supabase
        .from('toppers')
        .insert(batch)
        .select();
        
      if (error) {
        console.error(`Error inserting batch:`, error);
      } else {
        console.log(`Successfully inserted ${data.length} records`);
        successCount += data.length;
      }
    }
    
    console.log(`\n🎉 Import complete!`);
    console.log(`Successfully imported ${successCount} topper records`);
    
    // Show some sample data
    const { data: sampleData } = await supabase
      .from('toppers')
      .select(`
        *,
        managers(manager_name),
        players(name),
        seasons(year)
      `)
      .order('id')
      .limit(5);
      
    if (sampleData) {
      console.log('\nSample imported records:');
      sampleData.forEach(record => {
        console.log(`${record.seasons.year}: ${record.managers.manager_name} -> ${record.players.name}${record.is_winner ? ' (WINNER)' : ''}${record.is_unused ? ' (unused)' : ''}`);
      });
    }
    
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

importTopperData();