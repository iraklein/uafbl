const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function processPlayers() {
  try {
    // Get all existing players from Supabase
    console.log('Fetching existing players from Supabase...');
    const { data: existingPlayers, error } = await supabase
      .from('players')
      .select('*');

    if (error) {
      console.error('Error fetching existing players:', error);
      return;
    }

    console.log(`Found ${existingPlayers.length} existing players in Supabase`);

    // Find the maximum bbm_id currently in Supabase
    const maxExistingId = Math.max(...existingPlayers.map(p => p.bbm_id));
    console.log(`Maximum existing ID in Supabase: ${maxExistingId}`);

    // Load historical data
    console.log('Loading historical players data...');
    const historicalPlayers = JSON.parse(fs.readFileSync('historical-players.json', 'utf8'));
    
    // Create a set of existing player names for comparison
    const existingPlayerNames = new Set(existingPlayers.map(p => p.name.toLowerCase()));
    
    // Process historical players
    const playersToInsert = [];
    let nextId = 1;
    
    // Create a map of historical players with IDs
    const historicalWithIds = new Map();
    const historicalWithoutIds = [];
    
    historicalPlayers.forEach(player => {
      if (player.id && player.name) {
        historicalWithIds.set(player.name.toLowerCase(), player.id);
      } else if (player.name && !historicalWithIds.has(player.name.toLowerCase())) {
        historicalWithoutIds.push(player.name);
      }
    });

    console.log(`Historical players with IDs: ${historicalWithIds.size}`);
    console.log(`Historical players without IDs: ${historicalWithoutIds.length}`);

    // Check for players in historical data that aren't in Supabase
    const missingFromSupabase = [];
    
    // First check players with existing IDs
    historicalWithIds.forEach((id, name) => {
      if (!existingPlayerNames.has(name)) {
        missingFromSupabase.push({
          name: historicalPlayers.find(p => p.name && p.name.toLowerCase() === name).name, // Keep original case
          bbm_id: id,
          source: 'historical_with_id'
        });
      }
    });

    // Then check players without IDs
    historicalWithoutIds.forEach(playerName => {
      const nameLower = playerName.toLowerCase();
      if (!existingPlayerNames.has(nameLower) && !historicalWithIds.has(nameLower)) {
        missingFromSupabase.push({
          name: playerName,
          bbm_id: nextId,
          source: 'historical_without_id'
        });
        nextId++;
      }
    });

    console.log(`\nPlayers missing from Supabase: ${missingFromSupabase.length}`);
    console.log(`Players with existing IDs: ${missingFromSupabase.filter(p => p.source === 'historical_with_id').length}`);
    console.log(`Players needing new IDs: ${missingFromSupabase.filter(p => p.source === 'historical_without_id').length}`);

    // Show some examples
    console.log('\nFirst 10 players missing from Supabase:');
    missingFromSupabase.slice(0, 10).forEach((player, index) => {
      console.log(`${index + 1}. ${player.name} (ID: ${player.bbm_id}, Source: ${player.source})`);
    });

    // Save the analysis
    const analysis = {
      existingInSupabase: existingPlayers.length,
      maxExistingId,
      historicalWithIds: historicalWithIds.size,
      historicalWithoutIds: historicalWithoutIds.length,
      missingFromSupabase: missingFromSupabase.length,
      playersToInsert: missingFromSupabase
    };

    fs.writeFileSync('player-analysis.json', JSON.stringify(analysis, null, 2));
    console.log('\nAnalysis saved to player-analysis.json');

    // Create insert statements
    if (missingFromSupabase.length > 0) {
      console.log('\nWould you like to insert these players into Supabase? (This will be done in batches)');
      
      // Save insert script for review
      const insertScript = missingFromSupabase.map(player => ({
        bbm_id: player.bbm_id,
        name: player.name
      }));

      fs.writeFileSync('players-to-insert.json', JSON.stringify(insertScript, null, 2));
      console.log('Insert script saved to players-to-insert.json');
    }

  } catch (error) {
    console.error('Error processing players:', error);
  }
}

processPlayers();