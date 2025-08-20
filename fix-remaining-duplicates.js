const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRemainingDuplicates() {
  console.log('=== Fixing Remaining Duplicates ===\n');
  
  // Case 1: C.J. McCollum - exact duplicate record, just delete the one on ID 381
  console.log('1. Fixing C.J. McCollum duplicate record:');
  
  const { data: cjRecord } = await supabase
    .from('draft_results')
    .select('*')
    .eq('player_id', 381)
    .single();
    
  if (cjRecord) {
    console.log(`  Found duplicate record: Season ${cjRecord.season_id}, Manager ${cjRecord.manager_id}, Price ${cjRecord.draft_price}`);
    
    // Delete the duplicate record
    const { error: deleteError } = await supabase
      .from('draft_results')
      .delete()
      .eq('id', cjRecord.id);
      
    if (deleteError) {
      console.error(`  Error deleting duplicate record: ${deleteError.message}`);
    } else {
      console.log('  Successfully deleted duplicate record');
    }
    
    // Now delete the player
    const { error: playerDeleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', 381);
      
    if (playerDeleteError) {
      console.error(`  Error deleting player: ${playerDeleteError.message}`);
    } else {
      console.log('  Successfully deleted duplicate player ID 381');
    }
  }
  
  console.log('');
  
  // Case 2: Karl-Anthony Towns - transfer the record since there's no conflict
  console.log('2. Fixing Karl-Anthony Towns record:');
  
  const { data: karlRecord } = await supabase
    .from('draft_results')
    .select('*')
    .eq('player_id', 413)
    .single();
    
  if (karlRecord) {
    console.log(`  Found record to transfer: Season ${karlRecord.season_id}, Manager ${karlRecord.manager_id}, Price ${karlRecord.draft_price}`);
    
    // Transfer the record to the correct player ID
    const { error: updateError } = await supabase
      .from('draft_results')
      .update({ player_id: 5052 })
      .eq('id', karlRecord.id);
      
    if (updateError) {
      console.error(`  Error transferring record: ${updateError.message}`);
    } else {
      console.log('  Successfully transferred record to ID 5052');
    }
    
    // Now delete the player
    const { error: playerDeleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', 413);
      
    if (playerDeleteError) {
      console.error(`  Error deleting player: ${playerDeleteError.message}`);
    } else {
      console.log('  Successfully deleted duplicate player ID 413');
    }
  }
  
  console.log('');
  
  // Final verification
  console.log('=== Final Verification ===');
  
  const duplicateNames = [
    'C.J. McCollum', 'Karl-Anthony Towns', 'Karl Anthony Towns'
  ];
  
  for (const name of duplicateNames) {
    const { data: players } = await supabase
      .from('players')
      .select('id, name')
      .ilike('name', `%${name.replace('Karl-Anthony Towns', 'Karl%Anthony Towns')}%`)
      .order('id');
    
    if (players && players.length > 0) {
      console.log(`${name}: ${players.length} player(s) remaining`);
      players.forEach(p => console.log(`  ID ${p.id}: ${p.name}`));
      
      // Check draft counts for each
      for (const player of players) {
        const { count } = await supabase
          .from('draft_results')
          .select('*', { count: 'exact', head: true })
          .eq('player_id', player.id);
        console.log(`    ${count || 0} draft records`);
      }
    } else {
      console.log(`${name}: No players found`);
    }
  }
  
  console.log('\n=== All Duplicates Fixed ===');
}

fixRemainingDuplicates().catch(console.error);