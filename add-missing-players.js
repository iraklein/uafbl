const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingPlayers() {
  try {
    // Load missing players
    const missingPlayers = JSON.parse(fs.readFileSync('missing-players.json', 'utf8'));
    
    console.log(`Adding ${missingPlayers.length} missing players to players table...`);

    // Insert in batches
    const batchSize = 50;
    let inserted = 0;
    let errors = [];

    for (let i = 0; i < missingPlayers.length; i += batchSize) {
      const batch = missingPlayers.slice(i, i + batchSize);
      
      console.log(`Inserting batch ${Math.floor(i/batchSize) + 1}: players ${i + 1} to ${Math.min(i + batchSize, missingPlayers.length)}`);

      const { data, error } = await supabase
        .from('players')
        .insert(batch);

      if (error) {
        console.error(`Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        errors.push({ batch: Math.floor(i/batchSize) + 1, error: error.message });
        continue;
      }

      inserted += batch.length;
      console.log(`✓ Successfully inserted batch ${Math.floor(i/batchSize) + 1}`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n--- Insert Summary ---`);
    console.log(`Total players to insert: ${missingPlayers.length}`);
    console.log(`Successfully inserted: ${inserted}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nError details:');
      errors.forEach(err => {
        console.log(`Batch ${err.batch}: ${err.error}`);
      });
    }

    // Verify final player count
    const { count, error: countError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\nFinal player count in Supabase: ${count}`);
    }

    console.log('\nNow you can retry inserting the draft data:');
    console.log('node insert-draft-data-v2.js confirm');

  } catch (error) {
    console.error('Error adding missing players:', error);
  }
}

// Ask for confirmation
console.log('This will add 45 missing players to your Supabase players table.');
console.log('Run this script with: node add-missing-players.js confirm');

if (process.argv[2] === 'confirm') {
  addMissingPlayers();
} else {
  console.log('Add "confirm" as an argument to proceed with the insertion.');
}