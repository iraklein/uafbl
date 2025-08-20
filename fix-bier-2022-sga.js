const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBierSGA() {
  try {
    // Update the topper record (ID 117) to use the correct SGA player_id
    const { data, error } = await supabase
      .from('toppers')
      .update({
        player_id: 5693  // Shai Gilgeous-Alexander's player_id
      })
      .eq('id', 117);

    if (error) {
      console.error('Error updating topper record:', error);
      return;
    }

    console.log('Successfully updated Bier 2022 topper record');
    console.log('- Changed player from "SGA" to use Shai Gilgeous-Alexander (player_id: 5693)');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixBierSGA();