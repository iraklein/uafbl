const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findNextAvailableId(startId = 1816) {
  const { data, error } = await supabase
    .from('players')
    .select('id')
    .gte('id', startId)
    .lt('id', 2000)
    .order('id', { ascending: true });
    
  if (error) throw error;
  
  const usedIds = new Set(data.map(p => p.id));
  
  for (let id = startId; id < 2000; id++) {
    if (!usedIds.has(id)) {
      return id;
    }
  }
  
  throw new Error('No available IDs under 2000');
}

async function getAllReferencedHighIds() {
  console.log('Finding all high player IDs referenced by LSL and other tables...');
  
  // Get all high-ID players that are referenced by LSL
  const { data: lslRefs, error: lslError } = await supabase
    .from('lsl')
    .select('player_id')
    .gte('player_id', 7000);
    
  if (lslError) {
    console.error('Error getting LSL references:', lslError);
    return [];
  }
  
  const referencedIds = [...new Set(lslRefs.map(r => r.player_id))];
  console.log(`Found ${referencedIds.length} high player IDs referenced by LSL:`, referencedIds);
  
  return referencedIds;
}

async function migrateReferencedHighIds() {
  try {
    const referencedIds = await getAllReferencedHighIds();
    
    if (referencedIds.length === 0) {
      console.log('No referenced high IDs to migrate.');
      return [];
    }
    
    const migrations = [];
    
    // Get player details for the referenced high IDs
    const { data: playersToMigrate, error: playersError } = await supabase
      .from('players')
      .select('id, name')
      .in('id', referencedIds);
      
    if (playersError) {
      console.error('Error getting player details:', playersError);
      return [];
    }
    
    console.log('\nCreating new low-ID player records...');
    
    // Create new player records with low IDs
    for (const player of playersToMigrate) {
      try {
        const newId = await findNextAvailableId();
        console.log(`Creating: ID ${newId} for "${player.name}" (old ID: ${player.id})`);
        
        const { error } = await supabase
          .from('players')
          .insert({
            id: newId,
            name: player.name
          });
          
        if (error) {
          console.error(`Error creating player ${player.name}:`, error);
          continue;
        }
        
        migrations.push({
          oldId: player.id,
          newId: newId,
          name: player.name
        });
        
      } catch (error) {
        console.error(`Error processing ${player.name}:`, error);
      }
    }
    
    console.log(`\nCreated ${migrations.length} new player records.`);
    
    // Update LSL records
    console.log('\nUpdating LSL records...');
    for (const migration of migrations) {
      const { error } = await supabase
        .from('lsl')
        .update({ player_id: migration.newId })
        .eq('player_id', migration.oldId);
        
      if (error) {
        console.error(`Error updating LSL for ${migration.name}:`, error);
      } else {
        console.log(`Updated LSL: ${migration.oldId} -> ${migration.newId} (${migration.name})`);
      }
    }
    
    return migrations;
    
  } catch (error) {
    console.error('Error in migration:', error);
    return [];
  }
}

async function deleteAllHighIdPlayers() {
  try {
    console.log('\nDeleting all remaining high-ID player records...');
    
    // Get count first
    const { data: countData, error: countError } = await supabase
      .from('players')
      .select('id', { count: 'exact' })
      .gte('id', 7000);
      
    if (countError) {
      console.error('Error counting high-ID players:', countError);
      return;
    }
    
    const count = countData.length;
    console.log(`Found ${count} player records with IDs >= 7000 to delete`);
    
    if (count === 0) {
      console.log('No high-ID player records to delete.');
      return;
    }
    
    // Delete all high-ID players
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .gte('id', 7000);
      
    if (deleteError) {
      console.error('Error deleting high-ID players:', deleteError);
      return;
    }
    
    console.log(`✅ Successfully deleted ${count} high-ID player records`);
    
  } catch (error) {
    console.error('Error in cleanup:', error);
  }
}

async function main() {
  console.log('🚀 Starting comprehensive high-ID player migration...\n');
  
  // Step 1: Migrate all referenced high-ID players
  const migrations = await migrateReferencedHighIds();
  
  // Step 2: Delete old high-ID player records
  if (migrations.length > 0) {
    console.log('\nDeleting old high-ID player records...');
    for (const migration of migrations) {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', migration.oldId);
        
      if (error) {
        console.error(`Error deleting old player ${migration.oldId}:`, error);
      } else {
        console.log(`Deleted old player: ID ${migration.oldId} (${migration.name})`);
      }
    }
  }
  
  // Step 3: Clean up any remaining unreferenced high-ID players
  await deleteAllHighIdPlayers();
  
  console.log('\n🎉 Migration completed successfully!');
  console.log('All high player IDs (>= 7000) have been migrated to low IDs (< 2000) or removed.');
  console.log('High ID space is now reserved for future players/seasons.');
  
  if (migrations.length > 0) {
    console.log('\nMigration summary:');
    migrations.forEach(m => {
      console.log(`  ${m.oldId} -> ${m.newId}: ${m.name}`);
    });
  }
}

main().catch(console.error);