const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDuplicates() {
  console.log('=== Fixing Duplicate Players ===\n');
  
  // Define duplicates to fix - keep the ID with more draft appearances
  const duplicatesToFix = [
    { name: 'Aron Baynes', keepId: 389, removeId: 387, keepCount: 1, removeCount: 0 },
    { name: 'C.J. McCollum', keepId: 3723, removeId: 381, keepCount: 10, removeCount: 1 },
    { name: 'C.J. Miles', keepId: 107, removeId: 1004, keepCount: 5, removeCount: 3 },
    { name: 'J.R. Smith', keepId: 12, removeId: 83, keepCount: 7, removeCount: 2 },
    { name: 'P.J. Tucker', keepId: 133, removeId: 1005, keepCount: 4, removeCount: 2 },
    { name: 'Karl-Anthony Towns', keepId: 5052, removeId: 413, keepCount: 10, removeCount: 1 }
  ];
  
  // Players with 0 draft appearances on both IDs - just remove one
  const zeroUsageDuplicates = [
    { name: 'A.J. Griffin', keepId: 599, removeId: 604 },
    { name: 'A.J. Johnson', keepId: 609, removeId: 6956 }
  ];
  
  // Process duplicates that need draft record transfers
  for (const dup of duplicatesToFix) {
    console.log(`Processing ${dup.name}:`);
    console.log(`  Keeping ID ${dup.keepId} (${dup.keepCount} drafts)`);
    console.log(`  Removing ID ${dup.removeId} (${dup.removeCount} drafts)`);
    
    if (dup.removeCount > 0) {
      // Transfer draft records from removeId to keepId
      console.log(`  Transferring ${dup.removeCount} draft records...`);
      
      const { error: updateError } = await supabase
        .from('draft_results')
        .update({ player_id: dup.keepId })
        .eq('player_id', dup.removeId);
      
      if (updateError) {
        console.error(`  Error transferring draft records: ${updateError.message}`);
        continue;
      }
      console.log(`  Successfully transferred draft records`);
    }
    
    // Remove the duplicate player
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', dup.removeId);
    
    if (deleteError) {
      console.error(`  Error removing duplicate player: ${deleteError.message}`);
    } else {
      console.log(`  Successfully removed duplicate player ID ${dup.removeId}`);
    }
    
    console.log('');
  }
  
  // Process zero-usage duplicates (just delete one)
  for (const dup of zeroUsageDuplicates) {
    console.log(`Processing ${dup.name} (0 drafts on both IDs):`);
    console.log(`  Keeping ID ${dup.keepId}, removing ID ${dup.removeId}`);
    
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', dup.removeId);
    
    if (deleteError) {
      console.error(`  Error removing duplicate player: ${deleteError.message}`);
    } else {
      console.log(`  Successfully removed duplicate player ID ${dup.removeId}`);
    }
    
    console.log('');
  }
  
  // Verify the cleanup
  console.log('=== Verification ===');
  const duplicateNames = [
    'A.J. Griffin', 'A.J. Johnson', 'Aron Baynes', 'C.J. McCollum', 
    'C.J. Miles', 'J.R. Smith', 'P.J. Tucker', 'Karl-Anthony Towns', 'Karl Anthony Towns'
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
    } else {
      console.log(`${name}: No players found`);
    }
  }
  
  console.log('\n=== Duplicate Cleanup Complete ===');
}

fixDuplicates().catch(console.error);