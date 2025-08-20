require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey || !supabaseUrl) {
  console.error('Supabase configuration not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLSLAPI() {
  console.log('Debugging LSL API query...');
  
  try {
    // First, let's check a few LSL records to see the manager IDs
    const { data: rawLSL, error: rawError } = await supabase
      .from('lsl')
      .select('*')
      .limit(5);
      
    if (rawError) {
      console.error('Error fetching raw LSL:', rawError);
      return;
    }
    
    console.log('Sample LSL records:');
    rawLSL.forEach(record => {
      console.log(`ID ${record.id}: original_manager_id=${record.original_manager_id}, draft_manager_id=${record.draft_manager_id}`);
    });
    
    // Now try the JOIN query like the API does
    const { data: joinedData, error: joinError } = await supabase
      .from('lsl')
      .select(`
        *,
        players!inner(name),
        original_managers:managers!original_manager_id(manager_name),
        draft_managers:managers!draft_manager_id(manager_name)
      `)
      .limit(3);
      
    if (joinError) {
      console.error('Error with JOIN query:', joinError);
      return;
    }
    
    console.log('\\nJOIN query results:');
    joinedData.forEach(record => {
      console.log(`${record.players.name}:`);
      console.log(`  Original manager: ${record.original_managers ? record.original_managers.manager_name : 'NULL'}`);
      console.log(`  Draft manager: ${record.draft_managers ? record.draft_managers.manager_name : 'NULL'}`);
    });
    
    // Check if there are any manager IDs that don't exist in managers table
    console.log('\\nChecking for missing managers...');
    const { data: managers } = await supabase.from('managers').select('id');
    const managerIds = new Set(managers.map(m => m.id));
    
    const missingOriginal = rawLSL.filter(r => r.original_manager_id && !managerIds.has(r.original_manager_id));
    const missingDraft = rawLSL.filter(r => r.draft_manager_id && !managerIds.has(r.draft_manager_id));
    
    console.log(`Missing original managers: ${missingOriginal.length}`);
    console.log(`Missing draft managers: ${missingDraft.length}`);
    
    if (missingOriginal.length > 0) {
      console.log('Missing original manager IDs:', missingOriginal.map(r => r.original_manager_id));
    }
    if (missingDraft.length > 0) {
      console.log('Missing draft manager IDs:', missingDraft.map(r => r.draft_manager_id));
    }
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

debugLSLAPI();