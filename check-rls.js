const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRLS() {
  try {
    console.log('Testing database access...\n');
    
    // Test managers table
    const { data: managers, error: managersError } = await supabase
      .from('managers')
      .select('id, manager_name, email')
      .limit(3);
    
    if (managersError) {
      console.log('❌ Managers table error:', managersError.message);
    } else {
      console.log('✅ Managers table accessible:', managers?.length || 0, 'records');
    }

    // Test rosters table
    const { data: rosters, error: rostersError } = await supabase
      .from('rosters')
      .select('id')
      .limit(3);
    
    if (rostersError) {
      console.log('❌ Rosters table error:', rostersError.message);
    } else {
      console.log('✅ Rosters table accessible:', rosters?.length || 0, 'records');
    }

    // Test draft_results table
    const { data: draft, error: draftError } = await supabase
      .from('draft_results')
      .select('id')
      .limit(3);
    
    if (draftError) {
      console.log('❌ Draft results table error:', draftError.message);
    } else {
      console.log('✅ Draft results table accessible:', draft?.length || 0, 'records');
    }

  } catch (error) {
    console.error('Script error:', error.message);
  }
}

checkRLS();