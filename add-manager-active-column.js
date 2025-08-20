const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addManagerActiveColumn() {
  try {
    console.log('Adding is_active column to managers table...\n');

    // First, let's see current managers
    const { data: currentManagers } = await supabase
      .from('managers')
      .select('*')
      .order('id');

    console.log('Current managers:');
    currentManagers.forEach(manager => {
      console.log(`${manager.id}: ${manager.manager_name} (${manager.team_name})`);
    });

    // The inactive managers are Kenny and Glaspie based on our earlier work
    const inactiveManagers = ['Kenny', 'Glaspie'];
    
    console.log(`\n📋 Setting inactive status for: ${inactiveManagers.join(', ')}`);
    console.log('All others will be marked as active\n');

    // Update each manager
    for (const manager of currentManagers) {
      const isActive = !inactiveManagers.includes(manager.manager_name);
      
      console.log(`Updating ${manager.manager_name}: ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
      
      const { error } = await supabase
        .from('managers')
        .update({ is_active: isActive })
        .eq('id', manager.id);

      if (error) {
        console.error(`Error updating ${manager.manager_name}:`, error.message);
      }
    }

    // Verify the updates
    console.log('\n✅ Update complete! Current status:');
    
    const { data: updatedManagers } = await supabase
      .from('managers')
      .select('*')
      .order('is_active', { ascending: false });

    console.log('\n🟢 ACTIVE MANAGERS:');
    updatedManagers.filter(m => m.is_active).forEach(manager => {
      console.log(`  - ${manager.manager_name} (${manager.team_name})`);
    });

    console.log('\n🔴 INACTIVE MANAGERS:');
    updatedManagers.filter(m => !m.is_active).forEach(manager => {
      console.log(`  - ${manager.manager_name} (${manager.team_name})`);
    });

    console.log(`\nTotal: ${updatedManagers.filter(m => m.is_active).length} active, ${updatedManagers.filter(m => !m.is_active).length} inactive`);

  } catch (error) {
    console.error('Error:', error);
  }
}

console.log('This will add an is_active column to the managers table.');
console.log('Run with: node add-manager-active-column.js confirm');

if (process.argv[2] === 'confirm') {
  addManagerActiveColumn();
} else {
  console.log('Add "confirm" as an argument to proceed.');
}