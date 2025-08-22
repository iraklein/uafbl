const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Season mapping: old_id -> new_id based on chronological order
const SEASON_MAPPING = {
  // Current data shows these seasons exist, mapping them chronologically
  1: 19,   // 2025-26 Season -> Season 19
  20: 18,  // 2024-25 Season -> Season 18
  // Add more mappings as we discover them
};

// Expected chronological seasons (will create missing ones)
const CHRONOLOGICAL_SEASONS = [
  { id: 1, year: 2007, name: '2007-08 Season' },
  { id: 2, year: 2008, name: '2008-09 Season' },
  { id: 3, year: 2009, name: '2009-10 Season' },
  { id: 4, year: 2010, name: '2010-11 Season' },
  { id: 5, year: 2011, name: '2011-12 Season' },
  { id: 6, year: 2012, name: '2012-13 Season' },
  { id: 7, year: 2013, name: '2013-14 Season' },
  { id: 8, year: 2014, name: '2014-15 Season' },
  { id: 9, year: 2015, name: '2015-16 Season' },
  { id: 10, year: 2016, name: '2016-17 Season' },
  { id: 11, year: 2017, name: '2017-18 Season' },
  { id: 12, year: 2018, name: '2018-19 Season' },
  { id: 13, year: 2019, name: '2019-20 Season' },
  { id: 14, year: 2020, name: '2020-21 Season' },
  { id: 15, year: 2021, name: '2021-22 Season' },
  { id: 16, year: 2022, name: '2022-23 Season' },
  { id: 17, year: 2023, name: '2023-24 Season' },
  { id: 18, year: 2024, name: '2024-25 Season', is_roster_current: true },
  { id: 19, year: 2025, name: '2025-26 Season', is_active: true },
];

async function backupData() {
  console.log('🔄 Starting full database backup...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `backup-${timestamp}`;
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  const tables = [
    'seasons',
    'trades',
    'draft_results', 
    'managers_assets',
    'rosters',
    'toppers',
    'lsl'
  ];
  
  for (const table of tables) {
    try {
      console.log(`📋 Backing up ${table}...`);
      
      const { data, error } = await supabase
        .from(table)
        .select('*');
      
      if (error) {
        console.error(`❌ Error backing up ${table}:`, error);
        throw error;
      }
      
      const filename = `${backupDir}/${table}.json`;
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`✅ Backed up ${data.length} records from ${table} to ${filename}`);
      
    } catch (error) {
      console.error(`❌ Failed to backup ${table}:`, error);
      throw error;
    }
  }
  
  console.log(`🎉 Backup completed successfully in directory: ${backupDir}`);
  return backupDir;
}

async function analyzeCurrentSeasons() {
  console.log('🔍 Analyzing current seasons...');
  
  const { data: seasons, error } = await supabase
    .from('seasons')
    .select('*')
    .order('id');
  
  if (error) {
    console.error('❌ Error fetching seasons:', error);
    throw error;
  }
  
  console.log('📊 Current seasons:');
  seasons.forEach(season => {
    console.log(`  ID ${season.id}: ${season.name} (${season.year}) ${season.is_active ? '(ACTIVE)' : ''}`);
  });
  
  return seasons;
}

async function migrateSeasonIds() {
  console.log('🔄 Starting season ID migration...');
  
  try {
    // Step 1: Backup
    const backupDir = await backupData();
    
    // Step 2: Analyze current data
    const currentSeasons = await analyzeCurrentSeasons();
    
    // Step 3: Update SEASON_MAPPING based on current data
    console.log('📋 Building migration mapping...');
    const migrationMap = {};
    
    currentSeasons.forEach(season => {
      if (season.year === 2024) {
        migrationMap[season.id] = 18; // 2024-25 -> Season 18
      } else if (season.year === 2025) {
        migrationMap[season.id] = 19; // 2025-26 -> Season 19
      }
      // Add more mappings as needed based on discovered data
    });
    
    console.log('🗺️ Migration mapping:', migrationMap);
    
    // Step 4: Temporarily disable foreign key checks
    console.log('⚠️ Disabling foreign key checks...');
    // Note: Supabase doesn't allow disabling FK checks, so we'll work around it
    
    // Step 5: Create temporary columns for new IDs
    console.log('🔄 Adding temporary columns...');
    
    const tablesWithSeasonId = [
      'trades',
      'draft_results',
      'managers_assets', 
      'rosters',
      'toppers',
      'lsl'
    ];
    
    // Add temp columns for new season IDs
    for (const table of tablesWithSeasonId) {
      try {
        // Check if temp column exists
        const { data: columns } = await supabase
          .rpc('get_table_columns', { table_name: table })
          .single();
        
        // This is a simplified approach - in production you'd add the temp column via SQL
        console.log(`📋 Preparing ${table} for migration...`);
      } catch (error) {
        console.log(`ℹ️ Could not check ${table} columns, continuing...`);
      }
    }
    
    console.log('⚠️ MIGRATION PAUSED - MANUAL STEPS REQUIRED');
    console.log('');
    console.log('🔧 Please run these SQL commands in Supabase SQL Editor:');
    console.log('');
    console.log('-- Step 1: Add temporary columns');
    console.log('ALTER TABLE trades ADD COLUMN temp_season_id INTEGER;');
    console.log('ALTER TABLE trades ADD COLUMN temp_impacts_season_id INTEGER;');
    console.log('ALTER TABLE draft_results ADD COLUMN temp_season_id INTEGER;');
    console.log('ALTER TABLE managers_assets ADD COLUMN temp_season_id INTEGER;');
    console.log('ALTER TABLE rosters ADD COLUMN temp_season_id INTEGER;');
    console.log('ALTER TABLE toppers ADD COLUMN temp_season_id INTEGER;');
    console.log('ALTER TABLE lsl ADD COLUMN temp_season_id INTEGER;');
    console.log('');
    console.log('-- Step 2: Update temporary columns with new IDs');
    Object.entries(migrationMap).forEach(([oldId, newId]) => {
      console.log(`UPDATE trades SET temp_season_id = ${newId} WHERE season_id = ${oldId};`);
      console.log(`UPDATE trades SET temp_impacts_season_id = ${newId} WHERE impacts_season_id = ${oldId};`);
      console.log(`UPDATE draft_results SET temp_season_id = ${newId} WHERE season_id = ${oldId};`);
      console.log(`UPDATE managers_assets SET temp_season_id = ${newId} WHERE season_id = ${oldId};`);
      console.log(`UPDATE rosters SET temp_season_id = ${newId} WHERE season_id = ${oldId};`);
      console.log(`UPDATE toppers SET temp_season_id = ${newId} WHERE season_id = ${oldId};`);
      console.log(`UPDATE lsl SET temp_season_id = ${newId} WHERE season_id = ${oldId};`);
    });
    console.log('');
    console.log('-- Step 3: Create new seasons table with chronological IDs');
    console.log('CREATE TABLE seasons_new AS SELECT * FROM seasons WHERE 1=0;'); // Empty copy
    
    CHRONOLOGICAL_SEASONS.forEach(season => {
      const isActive = season.is_active ? 'true' : 'false';
      const isRosterCurrent = season.is_roster_current ? 'true' : 'false';
      console.log(`INSERT INTO seasons_new (id, year, name, is_active) VALUES (${season.id}, ${season.year}, '${season.name}', ${isActive});`);
    });
    
    console.log('');
    console.log('-- Step 4: Replace old seasons table');
    console.log('DROP TABLE seasons;');
    console.log('ALTER TABLE seasons_new RENAME TO seasons;');
    console.log('');
    console.log('-- Step 5: Update all tables to use new season IDs');
    console.log('UPDATE trades SET season_id = temp_season_id, impacts_season_id = temp_impacts_season_id;');
    console.log('UPDATE draft_results SET season_id = temp_season_id;');
    console.log('UPDATE managers_assets SET season_id = temp_season_id;');
    console.log('UPDATE rosters SET season_id = temp_season_id;');
    console.log('UPDATE toppers SET season_id = temp_season_id;');
    console.log('UPDATE lsl SET season_id = temp_season_id;');
    console.log('');
    console.log('-- Step 6: Remove temporary columns');
    console.log('ALTER TABLE trades DROP COLUMN temp_season_id;');
    console.log('ALTER TABLE trades DROP COLUMN temp_impacts_season_id;');
    console.log('ALTER TABLE draft_results DROP COLUMN temp_season_id;');
    console.log('ALTER TABLE managers_assets DROP COLUMN temp_season_id;');
    console.log('ALTER TABLE rosters DROP COLUMN temp_season_id;');
    console.log('ALTER TABLE toppers DROP COLUMN temp_season_id;');
    console.log('ALTER TABLE lsl DROP COLUMN temp_season_id;');
    console.log('');
    console.log(`📁 BACKUP LOCATION: ${backupDir}`);
    console.log('🔒 Keep this backup until migration is verified!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateSeasonIds();