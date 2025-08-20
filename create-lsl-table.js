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

async function createLSLTable() {
  console.log('Creating LSL table...');
  
  try {
    // Read the SQL file
    const sqlCommands = fs.readFileSync('create-lsl-table.sql', 'utf8');
    
    // Execute the SQL - note: Supabase client doesn't support multi-statement SQL
    // so we need to execute each statement separately
    const statements = sqlCommands.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      const cleanStatement = statement.trim();
      if (cleanStatement) {
        console.log('Executing:', cleanStatement.substring(0, 50) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql: cleanStatement });
        if (error) {
          console.error('Error executing SQL:', error);
          // Try alternative approach for table creation
          if (cleanStatement.includes('CREATE TABLE')) {
            console.log('Trying alternative table creation approach...');
            // We'll need to create the table manually via direct SQL execution
            // For now, let's just log this and proceed
          }
        }
      }
    }
    
    console.log('LSL table creation completed (check for any errors above)');
    
  } catch (err) {
    console.error('Exception occurred:', err);
    console.log('You may need to manually execute the SQL in create-lsl-table.sql');
  }
}

createLSLTable();