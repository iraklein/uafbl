const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkManagers() {
  try {
    const { data: managers, error } = await supabase
      .from('managers')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error fetching managers:', error);
      return;
    }

    console.log('Managers table:');
    managers.forEach(manager => {
      console.log(`ID: ${manager.id}, Team: ${manager.team_name}, Manager: ${manager.manager_name}`);
    });

    console.log(`\nTotal managers: ${managers.length}`);

    // Save for reference
    const fs = require('fs');
    fs.writeFileSync('managers-list.json', JSON.stringify(managers, null, 2));
    console.log('Managers saved to managers-list.json');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkManagers();