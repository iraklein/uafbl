const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixHaightTopper() {
  try {
    // First, find Giannis's player_id by searching for "Giannis Antetokounmpo"
    const { data: giannis, error: giannisError } = await supabase
      .from('players')
      .select('id')
      .eq('name', 'Giannis Antetokounmpo')
      .single();

    if (giannisError) {
      console.error('Error finding Giannis:', giannisError);
      return;
    }

    console.log('Found Giannis with player_id:', giannis.id);

    // Update the topper record (ID 125)
    const { data, error } = await supabase
      .from('toppers')
      .update({
        player_id: giannis.id,
        is_unused: true
      })
      .eq('id', 125);

    if (error) {
      console.error('Error updating topper record:', error);
      return;
    }

    console.log('Successfully updated Haight 2019 topper record');
    console.log('- Changed player to Giannis Antetokounmpo (player_id:', giannis.id, ')');
    console.log('- Set as unused');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixHaightTopper();