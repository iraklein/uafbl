const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupHighPlayerIds() {
  try {
    console.log('Finding all player records with IDs >= 7000...');
    
    // Get all high-ID player records
    const { data: highIdPlayers, error: fetchError } = await supabase
      .from('players')
      .select('id, name')
      .gte('id', 7000)
      .order('id', { ascending: true });
      
    if (fetchError) {
      console.error('Error fetching high-ID players:', fetchError);
      return;
    }
    
    console.log(`Found ${highIdPlayers.length} player records with IDs >= 7000`);
    
    if (highIdPlayers.length === 0) {
      console.log('No high-ID player records to clean up.');
      return;
    }
    
    console.log('\nDeleting all high-ID player records...');
    
    // Delete all players with IDs >= 7000
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .gte('id', 7000);
      
    if (deleteError) {
      console.error('Error deleting high-ID players:', deleteError);
      return;
    }
    
    console.log(`✅ Successfully deleted ${highIdPlayers.length} player records with high IDs`);
    console.log('\nCleanup completed! Player ID space >= 7000 is now free for future use.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

cleanupHighPlayerIds();