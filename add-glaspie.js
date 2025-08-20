const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addGlaspie() {
  try {
    console.log('Adding Glaspie as inactive manager...');
    
    const { data, error } = await supabase
      .from('managers')
      .insert([
        {
          team_name: 'Glaspie Team',
          manager_name: 'Glaspie'
        }
      ])
      .select();

    if (error) {
      console.error('Error adding Glaspie:', error);
      return;
    }

    console.log('Glaspie added successfully:', data[0]);
    
    // Refresh the managers list
    const { data: allManagers, error: fetchError } = await supabase
      .from('managers')
      .select('*')
      .order('id');

    if (!fetchError) {
      const fs = require('fs');
      fs.writeFileSync('managers-list.json', JSON.stringify(allManagers, null, 2));
      console.log('Updated managers list saved');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

addGlaspie();