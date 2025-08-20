const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addKenny() {
  try {
    console.log('Adding Kenny as inactive manager...');
    
    const { data, error } = await supabase
      .from('managers')
      .insert([
        {
          team_name: 'Kenny Team', // You can update this with the actual team name
          manager_name: 'Kenny'
        }
      ])
      .select();

    if (error) {
      console.error('Error adding Kenny:', error);
      return;
    }

    console.log('Kenny added successfully:', data[0]);
    
    // Refresh the managers list
    const { data: allManagers, error: fetchError } = await supabase
      .from('managers')
      .select('*')
      .order('id');

    if (!fetchError) {
      const fs = require('fs');
      fs.writeFileSync('managers-list.json', JSON.stringify(allManagers, null, 2));
      console.log('Updated managers list saved to managers-list.json');
      
      console.log(`\nUpdated managers (${allManagers.length} total):`);
      allManagers.forEach(manager => {
        console.log(`ID: ${manager.id}, Manager: ${manager.manager_name}, Team: ${manager.team_name}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

addKenny();