const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createDraftTable() {
  try {
    console.log('Creating draft_results table...');
    
    // Read and execute the SQL
    const sql = fs.readFileSync('create-draft-table.sql', 'utf8');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error creating table:', error);
      
      // Try alternative approach - create table directly
      console.log('Trying alternative approach...');
      
      const { error: createError } = await supabase.from('draft_results').select('*').limit(1);
      
      if (createError && createError.code === '42P01') { // Table doesn't exist
        console.log('Table does not exist, it needs to be created in Supabase SQL editor');
        console.log('Please run the SQL commands in create-draft-table.sql in your Supabase SQL editor');
        return false;
      }
    } else {
      console.log('Table created successfully!');
    }
    
    // Test the table
    const { data: testData, error: testError } = await supabase
      .from('draft_results')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.log('Table might not exist yet. Please create it manually using the SQL file.');
      return false;
    }
    
    console.log('draft_results table is ready!');
    return true;
    
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

createDraftTable();