const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTempTable() {
  try {
    console.log('🔄 Creating temporary table for Yahoo roster data...');
    
    // Create the table using a direct SQL query
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'yahoo_rosters_temp')
      .limit(1);
    
    if (error) {
      console.error('Error checking if table exists:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Table yahoo_rosters_temp already exists');
    } else {
      console.log('❌ Need to create the table manually in Supabase dashboard');
      console.log('\nPlease run this SQL in your Supabase SQL editor:');
      console.log('\n' + '-'.repeat(60));
      console.log(`
CREATE TABLE yahoo_rosters_temp (
  id SERIAL PRIMARY KEY,
  league_id TEXT NOT NULL,
  team_key TEXT NOT NULL,
  team_name TEXT,
  manager_name TEXT,
  yahoo_player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  player_positions TEXT[],
  status TEXT,
  raw_data JSONB,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  season_year INTEGER
);

-- Add some indexes for better performance
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_league_id ON yahoo_rosters_temp(league_id);
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_yahoo_player_id ON yahoo_rosters_temp(yahoo_player_id);
CREATE INDEX IF NOT EXISTS idx_yahoo_rosters_temp_manager_name ON yahoo_rosters_temp(manager_name);
      `);
      console.log('-'.repeat(60));
      console.log('\nAfter creating the table, run: node test-yahoo-rosters.js');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createTempTable();