const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function addImpactsSeasonColumn() {
  try {
    console.log('🔄 Adding impacts_season_id column to trades table...');
    
    // Add the column (this might fail if column already exists, which is fine)
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE trades ADD COLUMN IF NOT EXISTS impacts_season_id INTEGER REFERENCES seasons(id);'
    });
    
    if (addColumnError) {
      console.log('ℹ️  Column might already exist:', addColumnError.message);
    } else {
      console.log('✅ Successfully added impacts_season_id column');
    }
    
    // Update all existing trades to have impacts_season_id = 1 (upcoming season)
    console.log('🔄 Updating all trades to have impacts_season_id = 1...');
    
    const { data: updateResult, error: updateError } = await supabase
      .from('trades')
      .update({ impacts_season_id: 1 })
      .select('id');
    
    if (updateError) {
      console.error('❌ Error updating trades:', updateError);
      return;
    }
    
    console.log(`✅ Successfully updated ${updateResult.length} trades with impacts_season_id = 1`);
    console.log('🎉 Column addition and data update completed successfully!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

addImpactsSeasonColumn();