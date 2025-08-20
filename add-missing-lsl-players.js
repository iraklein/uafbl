require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey || !supabaseUrl) {
  console.error('Supabase configuration not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingLSLPlayers() {
  console.log('Adding missing LSL players to players table...');
  
  const missingPlayers = [
    'DeAndre Ayton',
    'Michael Porter, Jr.',
    'Frankie Ntilinka',
    'Trevon Duval',
    'Jaren Jackson, Jr.',
    'Wendall Carter, Jr.',
    'RJ Barrett',
    'Bol Bol',
    'Kevin Knox',
    'Cameron Reddish',
    'Charles Bassey',
    'Vernon Carey, Jr.',
    'Colin Sexton',
    'Sekou Doumbouya',
    'Emoni Bates',
    'Lebron James Jr',
    'RJ Hampton',
    'Patrick Baldwin, Jr.'
  ];
  
  try {
    // Get the highest existing ID
    const { data: maxIdResult, error: maxIdError } = await supabase
      .from('players')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
      
    if (maxIdError) {
      console.error('Error getting max ID:', maxIdError);
      return;
    }
    
    const nextId = maxIdResult.id + 1;
    console.log(`Next available ID: ${nextId}`);
    
    // Add players one by one with explicit IDs
    const addedPlayers = [];
    for (let i = 0; i < missingPlayers.length; i++) {
      const playerName = missingPlayers[i];
      const playerId = nextId + i;
      
      console.log(`Adding: ${playerName} with ID ${playerId}`);
      
      const { data, error } = await supabase
        .from('players')
        .insert({ 
          id: playerId, 
          name: playerName 
        })
        .select()
        .single();
        
      if (error) {
        console.error(`Error adding ${playerName}:`, error);
      } else {
        addedPlayers.push(data);
        console.log(`✓ Added: ${data.name} -> ID ${data.id}`);
      }
    }
    
    console.log(`\nSuccessfully added ${addedPlayers.length} players`);
    
    return addedPlayers;
    
  } catch (err) {
    console.error('Exception occurred:', err);
  }
}

addMissingLSLPlayers();