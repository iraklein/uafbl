const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function insertPlayers() {
  try {
    // Load the players to insert
    const playersToInsert = JSON.parse(fs.readFileSync('players-to-insert.json', 'utf8'));
    
    console.log(`Preparing to insert ${playersToInsert.length} players...`);

    // Insert in batches of 100 to avoid overwhelming the database
    const batchSize = 100;
    let inserted = 0;
    let errors = [];

    for (let i = 0; i < playersToInsert.length; i += batchSize) {
      const batch = playersToInsert.slice(i, i + batchSize);
      
      console.log(`Inserting batch ${Math.floor(i/batchSize) + 1}: players ${i + 1} to ${Math.min(i + batchSize, playersToInsert.length)}`);

      const { data, error } = await supabase
        .from('players')
        .insert(batch);

      if (error) {
        console.error(`Error in batch ${Math.floor(i/batchSize) + 1}:`, error);
        errors.push({ batch: Math.floor(i/batchSize) + 1, error });
        
        // Try to continue with remaining batches
        continue;
      }

      inserted += batch.length;
      console.log(`✓ Successfully inserted batch ${Math.floor(i/batchSize) + 1}`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n--- Insert Summary ---`);
    console.log(`Total players to insert: ${playersToInsert.length}`);
    console.log(`Successfully inserted: ${inserted}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nError details:');
      errors.forEach(err => {
        console.log(`Batch ${err.batch}:`, err.error.message);
      });
    }

    // Verify final count
    const { count, error: countError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\nFinal player count in Supabase: ${count}`);
    }

  } catch (error) {
    console.error('Error inserting players:', error);
  }
}

// Ask for confirmation before running
console.log('This will insert 696 players into your Supabase players table.');
console.log('Run this script with: node insert-players.js confirm');

if (process.argv[2] === 'confirm') {
  insertPlayers();
} else {
  console.log('Add "confirm" as an argument to proceed with the insertion.');
}