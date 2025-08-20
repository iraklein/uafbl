const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function insertDraftData() {
  try {
    // Load the draft data
    const draftResults = JSON.parse(fs.readFileSync('draft-results-raw.json', 'utf8'));
    
    console.log(`Preparing to insert ${draftResults.length} draft records...`);

    // Clean the data for insertion (remove reference fields)
    const cleanData = draftResults
      .filter(record => record.manager_id) // Only include records with valid manager mapping
      .map(record => ({
        player_id: record.player_id,
        season: record.season,
        draft_price: record.draft_price,
        manager_id: record.manager_id,
        is_keeper: record.is_keeper
      }));

    console.log(`After filtering: ${cleanData.length} valid records`);

    // Insert in batches
    const batchSize = 100;
    let inserted = 0;
    let errors = [];

    for (let i = 0; i < cleanData.length; i += batchSize) {
      const batch = cleanData.slice(i, i + batchSize);
      
      console.log(`Inserting batch ${Math.floor(i/batchSize) + 1}: records ${i + 1} to ${Math.min(i + batchSize, cleanData.length)}`);

      const { data, error } = await supabase
        .from('draft_results')
        .insert(batch);

      if (error) {
        console.error(`Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        errors.push({ batch: Math.floor(i/batchSize) + 1, error: error.message });
        
        // Continue with remaining batches
        continue;
      }

      inserted += batch.length;
      console.log(`✓ Successfully inserted batch ${Math.floor(i/batchSize) + 1}`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n--- Insert Summary ---`);
    console.log(`Total records to insert: ${cleanData.length}`);
    console.log(`Successfully inserted: ${inserted}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nError details:');
      errors.forEach(err => {
        console.log(`Batch ${err.batch}: ${err.error}`);
      });
    }

    // Verify final count
    const { count, error: countError } = await supabase
      .from('draft_results')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\nFinal draft records count in Supabase: ${count}`);
    }

    // Show some sample queries
    console.log('\n--- Sample Queries ---');
    
    // Most expensive draft picks
    const { data: expensive } = await supabase
      .from('draft_results')
      .select(`
        draft_price,
        season,
        players(name),
        managers(manager_name)
      `)
      .order('draft_price', { ascending: false })
      .limit(5);

    if (expensive) {
      console.log('\nTop 5 most expensive draft picks:');
      expensive.forEach((pick, index) => {
        console.log(`${index + 1}. ${pick.players.name} (${pick.season}): $${pick.draft_price} to ${pick.managers.manager_name}`);
      });
    }

  } catch (error) {
    console.error('Error inserting draft data:', error);
  }
}

// Ask for confirmation
console.log('This will insert ~1,497 draft records into your Supabase draft_results table.');
console.log('Run this script with: node insert-draft-data.js confirm');

if (process.argv[2] === 'confirm') {
  insertDraftData();
} else {
  console.log('Add "confirm" as an argument to proceed with the insertion.');
}