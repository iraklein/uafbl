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

async function insertLSLData() {
  console.log('Inserting LSL data into database...');
  
  try {
    // Load processed LSL data
    const lslRecords = JSON.parse(fs.readFileSync('lsl-ready-for-db.json', 'utf8'));
    
    console.log(`Preparing to insert ${lslRecords.length} LSL records...`);
    
    // First, let's create the table if it doesn't exist
    // Since we can't execute arbitrary SQL, we'll try to insert and handle errors
    console.log('Attempting to insert LSL data...');
    
    // Insert records in batches to handle any potential issues
    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < lslRecords.length; i += batchSize) {
      const batch = lslRecords.slice(i, i + batchSize);
      
      console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(lslRecords.length / batchSize)}...`);
      
      const { data, error } = await supabase
        .from('lsl_drafts')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        errorCount += batch.length;
        
        // If table doesn't exist, we might need to create it manually
        if (error.code === 'PGRST106') {
          console.log('Table does not exist. You may need to create the lsl_drafts table manually using the SQL in create-lsl-table.sql');
          break;
        }
      } else {
        console.log(`Successfully inserted ${data.length} records`);
        successCount += data.length;
      }
    }
    
    console.log(`\nInsertion Summary:`);
    console.log(`- Successfully inserted: ${successCount} records`);
    console.log(`- Errors: ${errorCount} records`);
    
    if (successCount > 0) {
      console.log('\nSample inserted records:');
      const { data: sampleData } = await supabase
        .from('lsl_drafts')
        .select('*')
        .order('year', { ascending: true })
        .order('draft_order', { ascending: true })
        .limit(5);
      
      if (sampleData) {
        sampleData.forEach(record => {
          console.log(`${record.year} Pick #${record.draft_order}: ${record.player_name} (${record.status})`);
        });
      }
    }
    
  } catch (err) {
    console.error('Exception occurred:', err);
    console.log('\nIf you encounter table creation issues, please manually execute the SQL in create-lsl-table.sql in your Supabase dashboard.');
  }
}

insertLSLData();