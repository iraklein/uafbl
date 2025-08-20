const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteTempPlayers() {
  try {
    console.log('Deleting temporary player records...');

    // Delete "Giannis or Harden?" player record (ID 7415)
    const { error: giannisError } = await supabase
      .from('players')
      .delete()
      .eq('id', 7415);

    if (giannisError) {
      console.error('Error deleting Giannis or Harden player:', giannisError);
      return;
    }

    console.log('✓ Deleted "Giannis or Harden?" player record (ID 7415)');

    // Delete "SGA" player record (ID 7407) 
    const { error: sgaError } = await supabase
      .from('players')
      .delete()
      .eq('id', 7407);

    if (sgaError) {
      console.error('Error deleting SGA player:', sgaError);
      return;
    }

    console.log('✓ Deleted "SGA" player record (ID 7407)');
    console.log('\nAll temporary player records have been cleaned up!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

deleteTempPlayers();