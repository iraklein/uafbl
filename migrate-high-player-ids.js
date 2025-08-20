const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjhrwwxvwqwmsjvelgrv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaHJ3d3h2d3F3bXNqdmVsZ3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTQ0MTcsImV4cCI6MjA3MTEzMDQxN30.0S2GIKB8u8Eqe9cnGZYRvofc271J5tiynJ4AmzABZf4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Players that need to be migrated from high IDs to low IDs
const playersToMigrate = [
  { oldId: 7403, name: "Alex Sarr" },
  { oldId: 7404, name: "Austin Reeves" },
  { oldId: 7405, name: "DeAndre Ayton" },
  { oldId: 7406, name: "Jabari Smith" },
  { oldId: 7408, name: "Benedict Mathurini" },
  { oldId: 7409, name: "De'aaron Fox" },
  { oldId: 7410, name: "Jaren Jackson Jr" },
  { oldId: 7411, name: "Killian Hayes" },
  { oldId: 7412, name: "Steph Curry" },
  { oldId: 7413, name: "RJ Barrett" },
  { oldId: 7414, name: "Darius Bazley" },
  { oldId: 7416, name: "Dwight Howard" },
  { oldId: 7417, name: "Kevin Knox" },
  { oldId: 7418, name: "Lebron James" },
  { oldId: 7419, name: "Larry Nance Jr" },
  { oldId: 7420, name: "Marc Gasol" }
];

async function findNextAvailableId(startId = 1800) {
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

async function migrateHighPlayerIds() {
  console.log('Starting migration of high player IDs to low IDs...\n');
  
  const migrations = [];
  
  // Step 1: Create new player records with low IDs
  for (const player of playersToMigrate) {
    try {
      const newId = await findNextAvailableId();
      console.log(`Creating new player: ID ${newId} for "${player.name}" (old ID: ${player.oldId})`);
      
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
        oldId: player.oldId,
        newId: newId,
        name: player.name
      });
      
    } catch (error) {
      console.error(`Error processing ${player.name}:`, error);
    }
  }
  
  console.log(`\nCreated ${migrations.length} new player records.\n`);
  
  // Step 2: Update topper records to use new player IDs
  for (const migration of migrations) {
    console.log(`Updating topper records: ${migration.oldId} -> ${migration.newId} (${migration.name})`);
    
    const { error } = await supabase
      .from('toppers')
      .update({ player_id: migration.newId })
      .eq('player_id', migration.oldId);
      
    if (error) {
      console.error(`Error updating topper records for ${migration.name}:`, error);
    }
  }
  
  console.log('\nUpdated all topper records.\n');
  
  // Step 3: Update LSL records if any exist with these IDs
  for (const migration of migrations) {
    const { error } = await supabase
      .from('lsl')
      .update({ player_id: migration.newId })
      .eq('player_id', migration.oldId);
      
    if (error && !error.message.includes('violates row-level security')) {
      console.error(`Error updating LSL records for ${migration.name}:`, error);
    }
  }
  
  console.log('Updated any LSL records.\n');
  
  // Step 4: Update draft_results records if any exist with these IDs  
  for (const migration of migrations) {
    const { error } = await supabase
      .from('draft_results')
      .update({ player_id: migration.newId })
      .eq('player_id', migration.oldId);
      
    if (error && !error.message.includes('violates row-level security')) {
      console.error(`Error updating draft_results records for ${migration.name}:`, error);
    }
  }
  
  console.log('Updated any draft_results records.\n');
  
  // Step 5: Delete the old high-ID player records
  for (const migration of migrations) {
    console.log(`Deleting old player record: ID ${migration.oldId} (${migration.name})`);
    
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', migration.oldId);
      
    if (error) {
      console.error(`Error deleting old player record ${migration.oldId}:`, error);
    }
  }
  
  console.log('\n✅ Migration completed successfully!');
  console.log(`Migrated ${migrations.length} players from high IDs (7403-7420) to low IDs (< 2000)`);
  console.log('\nMigration summary:');
  migrations.forEach(m => {
    console.log(`  ${m.oldId} -> ${m.newId}: ${m.name}`);
  });
}

migrateHighPlayerIds().catch(console.error);