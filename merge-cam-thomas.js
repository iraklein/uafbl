const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function mergeCamThomas() {
  try {
    console.log('Merging Cam Thomas and Cameron Thomas...');

    // Get both player records
    const { data: players } = await supabase
      .from('players')
      .select('id, name')
      .or('name.eq.Cam Thomas,name.eq.Cameron Thomas');

    const camThomas = players?.find(p => p.name === 'Cam Thomas');
    const cameronThomas = players?.find(p => p.name === 'Cameron Thomas');

    if (!camThomas || !cameronThomas) {
      console.error('Could not find both players');
      return;
    }

    console.log(`Cam Thomas ID: ${camThomas.id}`);
    console.log(`Cameron Thomas ID: ${cameronThomas.id}`);

    // Update all references to Cameron Thomas to point to Cam Thomas
    console.log('\nUpdating draft_results...');
    const { error: draftError } = await supabase
      .from('draft_results')
      .update({ player_id: camThomas.id })
      .eq('player_id', cameronThomas.id);

    if (draftError) {
      console.error('Error updating draft_results:', draftError);
      return;
    }

    console.log('Updating rosters...');
    const { error: rosterError } = await supabase
      .from('rosters')
      .update({ player_id: camThomas.id })
      .eq('player_id', cameronThomas.id);

    if (rosterError) {
      console.error('Error updating rosters:', rosterError);
      return;
    }

    console.log('Updating trades...');
    const { error: tradesError } = await supabase
      .from('trades')
      .update({ player_id: camThomas.id })
      .eq('player_id', cameronThomas.id);

    if (tradesError) {
      console.error('Error updating trades:', tradesError);
      return;
    }

    // Check for other tables that might reference players
    console.log('Checking toppers...');
    const { data: toppers } = await supabase
      .from('toppers')
      .select('id')
      .eq('player_id', cameronThomas.id);

    if (toppers?.length > 0) {
      console.log('Updating toppers...');
      const { error: toppersError } = await supabase
        .from('toppers')
        .update({ player_id: camThomas.id })
        .eq('player_id', cameronThomas.id);

      if (toppersError) {
        console.error('Error updating toppers:', toppersError);
        return;
      }
    }

    // Delete the duplicate Cameron Thomas record
    console.log(`\nDeleting Cameron Thomas (ID: ${cameronThomas.id})...`);
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', cameronThomas.id);

    if (deleteError) {
      console.error('Error deleting Cameron Thomas:', deleteError);
      return;
    }

    console.log('✅ Successfully merged players!');
    console.log('- Kept: Cam Thomas (ID: ' + camThomas.id + ')');
    console.log('- Deleted: Cameron Thomas (ID: ' + cameronThomas.id + ')');
    console.log('- All references updated to point to Cam Thomas');

    // Verify the merge
    console.log('\nVerifying merge...');
    const { data: verification } = await supabase
      .from('rosters')
      .select('managers!inner(manager_name)')
      .eq('player_id', camThomas.id)
      .eq('season_id', 19);

    if (verification?.length > 0) {
      console.log(`Cam Thomas is now on ${verification[0].managers.manager_name}'s roster`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

mergeCamThomas();